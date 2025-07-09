// backend-api/routes/passwordRoutes.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');

// --- FORGOT PASSWORD ---
// POST /api/password/forgot
// Generates a token. In a real app, this would also trigger an email.
router.post('/forgot', async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // NOTE: Don't reveal if an email exists.
      return res.status(200).json({ message: 'If a user with that email exists, a password reset token has been generated.' });
    }

    // Generate a random token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to user model
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // Token expires in 10 minutes

    await user.save();

    // --- EMAIL SENDING LOGIC WOULD GO HERE ---
    // For now, we return the token directly for testing purposes.
    // In production, NEVER send the token back in the JSON response.
    console.log(`Password reset token for ${email}: ${resetToken}`);
    res.json({
      message: 'Password reset token generated. In a real app, this would be emailed.',
      // The frontend needs the UN-hashed token to put in the URL
      // This is ONLY for development/testing without an email server.
      resetToken: resetToken
    });

  } catch (error) {
    next(error);
  }
});


// --- RESET PASSWORD ---
// PUT /api/password/reset/:token
// Resets the user's password using the token.
router.put('/reset/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash the incoming token so it can be compared to the one in the DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() } // Check if token is not expired
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    // Set the new password
    user.password = password;
    // Clear the reset token fields
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    // In a real app, you might want to log the user in here by creating a new JWT.
    // For simplicity, we'll just send a success message.

    res.json({ message: 'Password has been reset successfully.' });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
