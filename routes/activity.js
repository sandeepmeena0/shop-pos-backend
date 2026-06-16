import express from 'express';
import VisitorActivity from '../models/VisitorActivity.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/activity/log
// @desc    Log a new visitor activity
// @access  Public
router.post('/log', async (req, res) => {
  const { action, referrer } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    // Deduplicate: skip if same action from same IP within last 5 seconds
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const duplicate = await VisitorActivity.findOne({
      action,
      ipAddress,
      timestamp: { $gte: fiveSecondsAgo }
    });

    if (duplicate) {
      return res.status(200).json(duplicate);
    }

    const log = await VisitorActivity.create({
      action,
      ipAddress,
      userAgent,
      referrer
    });
    res.status(201).json(log);
  } catch (error) {
    console.error('Logging Error:', error);
    res.status(500).json({ message: 'Error creating log' });
  }
});

// @route   GET /api/activity/logs
// @desc    Get all visitor activity logs
// @access  Private (Admin & Super Admin only)
router.get('/logs', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const logs = await VisitorActivity.find({}).sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Error fetching logs' });
  }
});

export default router;
