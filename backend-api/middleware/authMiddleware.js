const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust path if your models folder is different

module.exports = async function (req, res, next) {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token format is "Bearer <token>"' });
  }

  const token = authHeader.substring(7, authHeader.length);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'YOUR_FALLBACK_JWT_SECRET_CHANGE_ME_IN_ENV');

    req.user = await User.findById(decoded.userId).select('-password'); // Exclude password

    if (!req.user) {
      return res.status(401).json({ message: 'User not found, token invalid.' });
    }
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    return res.status(401).json({ message: 'Token is not valid' });
  }
};
