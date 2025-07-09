// backend-api/models/Order.js
const mongoose = require('mongoose');

// --- Define Mongoose Schemas for Order ---
const addressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: String,
  city: { type: String, required: true },
  state: { type: String, required: true }, // Or province/region
  zipCode: { type: String, required: true }, // Or postal code
  country: { type: String, required: true },
}, { _id: false });

const customerInfoSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  phoneNumber: String, // Optional
  shippingAddress: { type: addressSchema, required: true },
  billingAddress: { type: addressSchema, required: true }, // Can be same as shipping
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Refers to _id within Product.variants
  sku: { type: String, required: true },
  name: { type: String, required: true }, // Snapshot: Product name (e.g., "Men's Classic T-Shirt")
  variantInfo: { type: String, required: true }, // Snapshot: Variant details (e.g., "Color: Navy Blue, Size: M")
  price: { type: Number, required: true }, // Snapshot: Price PAID per item at time of order
  quantity: { type: Number, required: true, min: 1 },
  imageUrl: { type: String } // Snapshot: Main variant image URL
}, { _id: false });

const shippingInfoSchema = new mongoose.Schema({
  method: { type: String, required: true }, // e.g., "Standard Shipping", "Express"
  cost: { type: Number, required: true, default: 0 }
}, { _id: false });

// Schema for storing details of an applied promo code within an order
const appliedPromoCodeSchema = new mongoose.Schema({
  promoCodeId: { // Reference to the actual PromoCode document
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromoCode', // Assuming your promo code model is named 'PromoCode'
    required: true
  },
  code: { // The promo code string itself (e.g., "SUMMER20")
    type: String,
    required: true,
    uppercase: true
  },
  discountType: { // 'percentage' or 'fixed'
    type: String,
    required: true,
    enum: ['percentage', 'fixed']
  },
  discountValueAtTimeOfOrder: { // The original value of the promo (e.g., 20 for 20%, or 10 for 10 EUR)
    type: Number,
    required: true
  },
  calculatedDiscountAmount: { // The actual monetary discount applied to this specific order
    type: Number,
    required: true
  }
}, { _id: false });


const orderSchema = new mongoose.Schema({
  customOrderId: { // User-friendly order ID, e.g., ORD-timestamp-random
    type: String,
    unique: true,
    required: true,
    index: true
  },
  orderDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  customerDetails: {
    type: customerInfoSchema,
    required: true
  },
  items: [orderItemSchema],
  subTotal: { // Sum of (item.price * item.quantity) BEFORE discounts
    type: Number,
    required: true
  },
  shippingInfo: {
    type: shippingInfoSchema,
    required: true
  },

  // --- Promo Code & Discount Fields ---
  appliedPromoCode: appliedPromoCodeSchema, // Optional: details of promo used
  discountAmount: { // Total monetary discount amount from promo
    type: Number,
    default: 0
  },
  // --- End Promo Code & Discount Fields ---

  grandTotal: { // subTotal - discountAmount + shippingInfo.cost
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending Payment', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded', 'Failed'], // Added more statuses
    default: 'Pending' // Or 'Pending Payment' if you have a separate payment step
  },
  userId: { // Link to the User model if the order was placed by a logged-in user
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Orders can be placed by guests
  },
  // Optional: payment details (e.g., paymentIntentId from Stripe, transactionId from PayPal)
  // paymentDetails: {
  //   paymentMethod: String, // e.g., 'stripe', 'paypal'
  //   transactionId: String,
  //   status: String // e.g., 'succeeded', 'pending', 'failed'
  // }
}, { timestamps: true });


// Pre-save hook to calculate/re-calculate grandTotal
orderSchema.pre('save', function (next) {
  // Check if relevant fields are modified or if it's a new document
  if (this.isModified('subTotal') || this.isModified('discountAmount') || this.isModified('shippingInfo') || this.isNew) {
    const subTotal = this.subTotal || 0;
    const discountAmount = this.discountAmount || 0;
    const shippingCost = this.shippingInfo?.cost || 0; // Use optional chaining for shippingInfo

    this.grandTotal = subTotal - discountAmount + shippingCost;
    this.grandTotal = parseFloat(this.grandTotal.toFixed(2)); // Ensure 2 decimal places
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
