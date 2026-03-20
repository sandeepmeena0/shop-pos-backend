import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user && user.active && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   POST /api/auth/setup
// @desc    Setup initial Super Admin if no users exist
// @access  Public (only works if 0 users in DB)
router.post('/setup', async (req, res) => {
  try {
    const userCount = await User.countDocuments({});
    if (userCount > 0) {
      return res.status(400).json({ message: 'Setup already completed. Users exist in the database.' });
    }

    const { name, username, password } = req.body;

    if (!name || !username || !password) {
       return res.status(400).json({ message: 'Please provide name, username, and password' });
    }

    const user = await User.create({
      name,
      username,
      password,
      role: 'Super Admin',
      active: true
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Setup Error:', error.message);
    res.status(500).json({ message: 'Server error during setup', error: error.message });
  }
});

export default router;
