// backend-api/routes/uploadRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adminOnlyMiddleware = require('../middleware/adminOnlyMiddleware');

const router = express.Router();

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up Multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename to avoid overwrites
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB file size limit
  },
  fileFilter: fileFilter
});


// POST /api/admin/upload - Handle a single image upload
// This route is protected by admin-only middleware
router.post('/', adminOnlyMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'Please upload a file.' });
  }
  // IMPORTANT: In a real production app, the server URL should come from an environment variable.
  // This is a simplified example. For production, you'd likely upload to a CDN (S3, Cloudinary)
  // and return that URL instead.
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  res.status(201).send({
    message: 'File uploaded successfully.',
    url: fileUrl // The URL to save in your database
  });
});

// To make the uploaded files accessible, you need a static route in server.js
// I've added this to `server.js` but will note it here for context:
// `app.use('/uploads', express.static(path.join(__dirname, 'uploads')));`
// THIS IS NOT NEEDED IN THIS FILE. IT'S A REMINDER.

module.exports = router;
