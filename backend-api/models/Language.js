// backend-api/models/Language.js
const mongoose = require('mongoose');

const languageSchema = new mongoose.Schema({
  name: { // The human-readable name, e.g., "English", "German"
    type: String,
    required: true,
    unique: true
  },
  code: { // The ISO 639-1 code, e.g., "en", "de"
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 2,
    maxlength: 2
  },
  isDefault: { // Mark one language (usually English) as the default
    type: Boolean,
    default: false
  },
  isActive: { // Allows an admin to temporarily hide a language from forms
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Ensure only one language can be the default
languageSchema.index({ isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

module.exports = mongoose.model('Language', languageSchema);
