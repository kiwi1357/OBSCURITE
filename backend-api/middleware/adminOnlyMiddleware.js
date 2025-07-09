// backend-api/middleware/adminOnlyMiddleware.js
const authMiddleware = require('./authMiddleware'); // Assuming it's in the same directory

const adminOnlyMiddleware = [
  authMiddleware, // First, ensure user is authenticated
  (req, res, next) => {
    // authMiddleware should have populated req.user
    if (req.user && req.user.role === 'admin') {
      next(); // User is admin, proceed
    } else {
      console.warn('[ADMIN CHECK] Forbidden: User is not an admin or req.user not set.', req.user);
      res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
  }
];

module.exports = adminOnlyMiddleware;
