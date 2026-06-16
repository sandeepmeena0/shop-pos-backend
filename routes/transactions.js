import express from 'express';
import Transaction from '../models/Transaction.js';
import Product from '../models/Product.js';
import StockHistory from '../models/StockHistory.js';
import Setting from '../models/Setting.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// @route   POST /api/transactions
// @desc    Create a new transaction (checkout)
// @access  Worker, Admin, Super Admin
router.post('/', async (req, res) => {
  const { items, discount, taxAmount, taxRate, paymentMethod } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'No items in cart' });
  }

  try {
    // Verify stock and compute totals
    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product not found` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}. Available: ${product.stock}` });
      }
      const lineTotal = product.price * item.quantity;
      totalAmount += lineTotal;
      processedItems.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        total: lineTotal,
      });
    }

    const discountAmount = discount || 0;
    const finalTaxAmount = taxAmount || 0;
    const finalAmount = totalAmount - discountAmount + finalTaxAmount;

    // Generate receipt number
    const settings = await Setting.findOne() || { receiptPrefix: 'RCP-' };
    const receiptNumber = `${settings.receiptPrefix}${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const transaction = await Transaction.create({
      receiptNumber,
      items: processedItems,
      totalAmount,
      discount: discountAmount,
      taxAmount: finalTaxAmount,
      taxRate: taxRate || 0,
      finalAmount,
      paymentMethod,
      cashierId: req.user._id,
    });

    // Deduct stock and log history
    for (const item of processedItems) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
      await StockHistory.create({
        productId: item.productId,
        type: 'SALE',
        quantity: -item.quantity,
        workerId: req.user._id,
        reason: `Sale - Receipt ${receiptNumber}`,
      });
    }

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Transaction failed', error: error.message });
  }
});

// @route   GET /api/transactions
// @desc    Get all transactions (Admin/Super Admin see all, Worker sees own)
// @access  All authenticated
router.get('/', async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'Worker') {
      query.cashierId = req.user._id;
    }

    const transactions = await Transaction.find(query)
      .populate('cashierId', 'name username')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions' });
  }
});

// @route   POST /api/transactions/:id/return
// @desc    Process a return for a transaction
// @access  Worker, Admin, Super Admin
router.post('/:id/return', async (req, res) => {
  const { items, reason } = req.body; // items: [{ productId, quantity }]

  try {
    const originalTxn = await Transaction.findById(req.params.id);
    if (!originalTxn) return res.status(404).json({ message: 'Original transaction not found' });

    // Find all previous returns for this transaction to check remaining returnable quantity
    const previousReturns = await Transaction.find({
      parentTransactionId: originalTxn._id,
      type: 'RETURN'
    });

    // Map of productId -> totalQtyReturnedSoFar
    const returnedQtyMap = {};
    previousReturns.forEach(ret => {
      ret.items.forEach(item => {
        const pid = item.productId.toString();
        returnedQtyMap[pid] = (returnedQtyMap[pid] || 0) + item.quantity;
      });
    });

    let totalRefund = 0;
    const processedItems = [];

    for (const returnItem of items) {
      const originalItem = originalTxn.items.find(i => i.productId.toString() === returnItem.productId);
      if (!originalItem) return res.status(400).json({ message: `Item ${returnItem.productId} not part of original sale` });

      const alreadyReturned = returnedQtyMap[originalItem.productId.toString()] || 0;
      const remainingToReturn = originalItem.quantity - alreadyReturned;

      if (returnItem.quantity > remainingToReturn) {
        return res.status(400).json({
          message: `Cannot return ${returnItem.quantity} units of ${originalItem.name}. Only ${remainingToReturn} remaining from original sale (Already returned: ${alreadyReturned}).`
        });
      }

      const lineTotal = originalItem.price * returnItem.quantity;
      totalRefund += lineTotal;

      processedItems.push({
        productId: originalItem.productId,
        name: originalItem.name,
        quantity: returnItem.quantity,
        price: originalItem.price,
        total: lineTotal
      });
    }

    const refundTaxAmount = (totalRefund * (originalTxn.taxRate || 0)) / 100;
    const finalRefundAmount = totalRefund + refundTaxAmount;

    // Generate refund receipt number
    const settings = await Setting.findOne() || { returnPrefix: 'RET-' };
    const receiptNumber = `${settings.returnPrefix}${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const returnTxn = await Transaction.create({
      receiptNumber,
      type: 'RETURN',
      parentTransactionId: originalTxn._id,
      items: processedItems,
      totalAmount: -totalRefund,
      taxAmount: -refundTaxAmount,
      taxRate: originalTxn.taxRate || 0,
      finalAmount: -finalRefundAmount,
      paymentMethod: originalTxn.paymentMethod,
      cashierId: req.user._id,
      reason: reason || 'Customer Return',
    });

    // Restore stock and log history
    for (const item of processedItems) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
      await StockHistory.create({
        productId: item.productId,
        type: 'RETURN',
        quantity: item.quantity,
        workerId: req.user._id,
        reason: `Return - Receipt ${receiptNumber}. Reason: ${reason || 'Customer Return'}`,
      });
    }

    res.status(201).json(returnTxn);
  } catch (error) {
    res.status(500).json({ message: 'Return failed', error: error.message });
  }
});

// @route   GET /api/transactions/lookup/:receiptNumber
// @desc    Find any transaction by receipt (Worker-friendly)
// @access  All authenticated
router.get('/lookup/:receiptNumber', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ receiptNumber: req.params.receiptNumber })
      .populate('cashierId', 'name username');

    if (!transaction) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Error seeking receipt' });
  }
});

export default router;
