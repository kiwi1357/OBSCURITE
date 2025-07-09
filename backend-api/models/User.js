// backend-api/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Sub-schema for user addresses
const userAddressSchema = new mongoose.Schema({
  addressName: { type: String, trim: true, maxlength: 50 }, // e.g., "Home", "Work"
  fullName: { type: String, required: [true, 'Full name is required for address.'], trim: true },
  addressLine1: { type: String, required: [true, 'Address line 1 is required.'], trim: true },
  addressLine2: { type: String, trim: true },
  city: { type: String, required: [true, 'City is required.'], trim: true },
  state: { type: String, required: [true, 'State/Province/Region is required.'], trim: true },
  zipCode: { type: String, required: [true, 'Zip/Postal code is required.'], trim: true },
  country: { type: String, required: [true, 'Country is required.'], trim: true }, // Consider using ISO country codes
  phoneNumber: { type: String, trim: true }, // Optional phone for this specific address
  isDefaultShipping: { type: Boolean, default: false },
  isDefaultBilling: { type: Boolean, default: false }
  // Mongoose will add _id to each address subdocument by default, which we will use.
});

// Sub-schema for tracking which promo codes a user has utilized
const usedPromoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  promoCodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromoCode',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  usedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/, 'Please fill a valid email address']
  },
  password: {
    type: String,
    required: function () { return this.role !== 'guest'; }, // Password not required for guest role
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'guest'],
    default: 'user'
  },
  phoneNumber: { // User's main/default phone number
    type: String,
    trim: true,
    required: false
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  // --- WISHLIST FIELD ADDED ---
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  // --- END OF CHANGE ---
  usedPromoCodes: [usedPromoCodeSchema],

  // --- User Addresses ---
  addresses: [userAddressSchema], // Array of addresses
  defaultShippingAddressId: { type: mongoose.Schema.Types.ObjectId, ref: 'User.addresses', default: null }, // Refers to an _id within the addresses array
  defaultBillingAddressId: { type: mongoose.Schema.Types.ObjectId, ref: 'User.addresses', default: null }  // Refers to an _id within the addresses array

}, { timestamps: true });

// --- Hooks & Methods ---

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Manage default addresses and their IDs
userSchema.pre('save', function (next) {
  // Only run if addresses array is modified to avoid unnecessary processing
  if (this.isModified('addresses')) {
    let foundDefaultShipping = null;
    let foundDefaultBilling = null;

    this.addresses.forEach(addr => {
      // Ensure only one default shipping
      if (addr.isDefaultShipping) {
        if (foundDefaultShipping) { // If another default shipping was already found
          addr.isDefaultShipping = false; // Unset this one
        } else {
          foundDefaultShipping = addr;
        }
      }
      // Ensure only one default billing
      if (addr.isDefaultBilling) {
        if (foundDefaultBilling) { // If another default billing was already found
          addr.isDefaultBilling = false; // Unset this one
        } else {
          foundDefaultBilling = addr;
        }
      }
    });

    // Update the top-level default ID fields
    this.defaultShippingAddressId = foundDefaultShipping ? foundDefaultShipping._id : null;
    this.defaultBillingAddressId = foundDefaultBilling ? foundDefaultBilling._id : null;
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Error handling for duplicate keys
userSchema.post('save', function (error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
    next(new Error(message));
  } else if (error.name === 'ValidationError') {
    // Consolidate Mongoose validation errors into a more readable message
    let messages = Object.values(error.errors).map(val => val.message);
    next(new Error(messages.join(', ')));
  }
  else {
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema);
