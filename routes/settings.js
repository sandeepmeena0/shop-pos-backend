import express from 'express';
import Setting from '../models/Setting.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apply protection to all routes below
router.use(protect);

// @route   GET /api/settings
// @desc    Get global store settings
// @access  Authenticated
router.get('/', async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({}); // Create default if none exists
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/settings
// @desc    Update store settings
// @access  Super Admin Only
router.put('/', authorize('Super Admin'), async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
       settings = new Setting(req.body);
    } else {
       Object.assign(settings, req.body);
    }
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
