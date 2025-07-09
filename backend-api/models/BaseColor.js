// backend-api/models/BaseColor.js
const mongoose = require('mongoose');

const baseColorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true // e.g., "red", "blue", "multi-color"
  },
  // Optional: Add a hex code to represent the color family in the admin UI
  hexCode: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// ADD THIS LINE
baseColorSchema.index({ name: 'text' });

module.exports = mongoose.model('BaseColor', baseColorSchema);
