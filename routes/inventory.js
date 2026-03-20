import express from 'express';
import Product from '../models/Product.js';
import StockHistory from '../models/StockHistory.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// @route   POST /api/inventory/restock
// @desc    Restock a product
// @access  Worker, Admin, Super Admin
router.post('/restock', async (req, res) => {
  const { productId, quantity, reason } = req.body;

  if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than zero' });
  }

  try {
    const product = await Product.findById(productId);
    
    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }

    product.stock += quantity;
    await product.save();

    const history = await StockHistory.create({
      productId: product._id,
      type: 'RESTOCK',
      quantity: quantity,
      workerId: req.user._id,
      reason: reason || 'Routine Restock'
    });

    res.status(200).json({ product, history });
  } catch (error) {
    res.status(500).json({ message: 'Failed to restock inventory', error: error.message });
  }
});

// @route   GET /api/inventory/history/:productId
// @desc    Get stock history for a specific product
// @access  Worker, Admin, Super Admin
router.get('/history/:productId', async (req, res) => {
    try {
       const history = await StockHistory.find({ productId: req.params.productId })
         .populate('workerId', 'name username')
         .sort({ createdAt: -1 });
       
       res.json(history);
    } catch(err) {
       res.status(500).json({ message: 'Failed to fetch history' });
    }
});

export default router;
