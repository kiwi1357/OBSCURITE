// backend-api/models/Category.js
const mongoose = require('mongoose');

const translationSchema = new mongoose.Schema({
  lang: { type: String, required: true, trim: true, lowercase: true },
  value: { type: String, required: true, trim: true }
}, { _id: false });

const categorySchema = new mongoose.Schema({
  name: {
    type: [translationSchema], // Changed
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  image: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// Auto-generate slug
categorySchema.pre('validate', function (next) {
  if (this.isModified('name') || this.isNew) {
    const englishName = this.name.find(n => n.lang === 'en');
    if (englishName && englishName.value) {
      this.slug = englishName.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
    }
  }
  next();
});

categorySchema.index({ 'name.value': 'text' });

module.exports = mongoose.model('Category', categorySchema);
