import express from 'express';
import Transaction from '../models/Transaction.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// @route   GET /api/dashboard
// @desc    Get dashboard statistics
// @access  Worker, Admin, Super Admin
router.get('/', authorize('Worker', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's transactions
    const todayTransactions = await Transaction.find({
      createdAt: { $gte: today, $lt: tomorrow },
    });

    const todaySales = todayTransactions.filter(t => t.type !== 'RETURN').reduce((sum, t) => sum + t.finalAmount, 0);
    const todayRefunds = todayTransactions.filter(t => t.type === 'RETURN').reduce((sum, t) => sum + Math.abs(t.finalAmount), 0);
    const todayOrders = todayTransactions.filter(t => t.type !== 'RETURN').length;

    // This month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthTransactions = await Transaction.find({
      createdAt: { $gte: startOfMonth },
    });
    const monthlySales = monthTransactions.filter(t => t.type !== 'RETURN').reduce((sum, t) => sum + t.finalAmount, 0);
    const monthlyRefunds = monthTransactions.filter(t => t.type === 'RETURN').reduce((sum, t) => sum + Math.abs(t.finalAmount), 0);

    // Low stock products
    const lowStockProducts = await Product.find({
      $expr: { $lte: ['$stock', '$lowStockThreshold'] },
      active: true,
    }).select('name stock lowStockThreshold category');

    // Total counts
    const totalProducts = await Product.countDocuments({ active: true });
    const totalUsers = await User.countDocuments({ active: true });

    // Recent 5 transactions
    const recentTransactions = await Transaction.find({})
      .populate('cashierId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      today: {
        sales: todaySales,
        refunds: todayRefunds,
        orders: todayOrders,
      },
      monthly: {
        sales: monthlySales,
        refunds: monthlyRefunds,
        orders: monthTransactions.filter(t => t.type !== 'RETURN').length,
      },
      lowStockProducts,
      totalProducts,
      totalUsers,
      recentTransactions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
  }
});

export default router;