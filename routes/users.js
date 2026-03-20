import express from 'express';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apply protection to all routes below
router.use(protect);

// @route   GET /api/users
// @desc    Get all users
// @access  Super Admin, Admin
router.get('/', authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// @route   POST /api/users
// @desc    Create new user
// @access  Super Admin, Admin
router.post('/', authorize('Super Admin', 'Admin'), async (req, res) => {
  const { name, username, password, role } = req.body;

  try {
    // Only Super Admin can create other Super Admins or Admins
    if (role === 'Super Admin' && req.user.role !== 'Super Admin') {
        return res.status(403).json({ message: 'Only Super Admins can create Super Admin accounts' });
    }
    if (role === 'Admin' && req.user.role !== 'Super Admin') {
        return res.status(403).json({ message: 'Only Super Admins can create Admin accounts' });
    }

    const userExists = await User.findOne({ username });

    if (userExists) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const user = await User.create({
      name,
      username,
      password,
      role: role || 'Worker'
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      active: user.active
    });
  } catch (error) {
    res.status(400).json({ message: 'Invalid user data or server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Super Admin, Admin
router.put('/:id', authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      // Prevent Admins from modifying Super Admins
      if (user.role === 'Super Admin' && req.user.role !== 'Super Admin') {
          return res.status(403).json({ message: 'Cannot modify Super Admin accounts' });
      }

      user.name = req.body.name || user.name;
      user.role = req.body.role || user.role;
      
      if (req.body.password) {
         user.password = req.body.password;
      }
      
      if (typeof req.body.active !== 'undefined') {
          user.active = req.body.active;
      }

      const updatedUser = await user.save();
      
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        role: updatedUser.role,
        active: updatedUser.active
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Invalid user data' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Super Admin
router.delete('/:id', authorize('Super Admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await user.deleteOne();
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
