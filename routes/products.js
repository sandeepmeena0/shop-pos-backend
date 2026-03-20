import express from 'express';
import Product from '../models/Product.js';
import StockHistory from '../models/StockHistory.js';
import Setting from '../models/Setting.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// @route   GET /api/products
// @desc    Get all products
// @access  Workers, Admin, Super Admin
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ active: true }).sort({ name: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// @route   GET /api/products/all
// @desc    Get all products (including inactive for admin view)
// @access  Admin, Super Admin
router.get('/all', authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const products = await Product.find({}).sort({ name: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// @route   POST /api/products
// @desc    Create a product
// @access  Admin, Super Admin
router.post('/', authorize('Admin', 'Super Admin'), async (req, res) => {
  const { name, price, stock, lowStockThreshold, category, barcode } = req.body;

  try {
    const productExists = await Product.findOne({ barcode });
    if (productExists) {
        return res.status(400).json({ message: 'Product with this barcode already exists' });
    }

    const settings = await Setting.findOne() || { defaultLowStockThreshold: 10 };
    const finalThreshold = lowStockThreshold !== undefined ? lowStockThreshold : settings.defaultLowStockThreshold;

    const product = await Product.create({
      name, price, stock, lowStockThreshold: finalThreshold, category, barcode
    });

    // Log the initial stock creation as history
    await StockHistory.create({
      productId: product._id,
      type: 'INITIAL',
      quantity: stock,
      workerId: req.user._id,
      reason: 'Initial Product Creation'
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: 'Invalid product data', error: error.message });
  }
});

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Admin, Super Admin
router.put('/:id', authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      if (req.body.barcode && req.body.barcode !== product.barcode) {
        const barcodeExists = await Product.findOne({ barcode: req.body.barcode });
        if (barcodeExists) {
           return res.status(400).json({ message: 'Barcode is already used by another product' });
        }
      }

      product.name = req.body.name || product.name;
      product.price = req.body.price !== undefined ? req.body.price : product.price;
      // We do not update stock here directly; we use the restock API for transparency
      if (req.body.lowStockThreshold !== undefined) product.lowStockThreshold = req.body.lowStockThreshold;
      product.category = req.body.category || product.category;
      product.barcode = req.body.barcode || product.barcode;
      
      if (typeof req.body.active !== 'undefined') {
          product.active = req.body.active;
      }

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Invalid product data', error: error.message });
  }
});

export default router;
