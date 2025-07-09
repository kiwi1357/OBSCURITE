// backend-api/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');

// --- User Registration ---
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, phoneNumber } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    user = new User({
      username: username,
      email: email,
      password: password,
      phoneNumber: phoneNumber
    });

    await user.save();

    const payload = { userId: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      message: 'User registered successfully!',
      token: token,
      user: { id: user.id, email: user.email, username: user.username, role: user.role, phoneNumber: user.phoneNumber }
    });

  } catch (error) {
    // Pass error to the centralized error handler
    next(error);
  }
});

// --- User Login ---
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const payload = { userId: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      message: 'Login successful!',
      token: token,
      user: { id: user.id, email: user.email, username: user.username, role: user.role, phoneNumber: user.phoneNumber }
    });
  } catch (error) {
    // Pass error to the centralized error handler
    next(error);
  }
});

// --- GET Current User Profile (Protected) ---
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    // req.user is populated by authMiddleware and password is not selected
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      phoneNumber: user.phoneNumber
    });
  } catch (error) {
    // Pass error to the centralized error handler
    next(error);
  }
});

module.exports = router;
