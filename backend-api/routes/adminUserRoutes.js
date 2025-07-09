// backend-api/routes/adminUserRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const adminOnlyMiddleware = require('../middleware/adminOnlyMiddleware');

// Protect all routes in this file
router.use(adminOnlyMiddleware);

// GET /api/admin/users - Get all users with pagination
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments();
    const users = await User.find()
      .select('-password -passwordResetToken -passwordResetExpires') // Exclude sensitive fields
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: users,
      pagination: {
        totalItems: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users/:id - Get a single user by ID
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID format.' });
    }
    const user = await User.findById(req.params.id).select('-password -passwordResetToken -passwordResetExpires');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id - Update a user's details (e.g., role, username)
router.put('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    // Only allow specific fields to be updated by an admin
    const { username, email, role, phoneNumber } = req.body;
    const updateData = { username, email, role, phoneNumber };

    // Prevent admin from changing password directly. They should use a reset flow.
    if (req.body.password) {
      return res.status(400).json({ message: 'Admin cannot directly change user password. Use password reset flow.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(updatedUser);
  } catch (error) {
    // Handle unique constraint error (e.g., email already exists)
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email or username already in use.' });
    }
    next(error);
  }
});

// DELETE /api/admin/users/:id - Delete a user
router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    // Prevent an admin from deleting their own account
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
