require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const passwordRoutes = require('./routes/passwordRoutes');
const publicProductRoutes = require('./routes/publicProductRoutes');
const publicCategoryRoutes = require('./routes/publicCategoryRoutes');
const publicBrandRoutes = require('./routes/publicBrandRoutes');
const searchRoutes = require('./routes/searchRoutes');
const orderRoutes = require('./routes/orderRoutes');
const languageRoutes = require('./routes/languageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes'); // << IMPORT NEW ROUTES
const lookbookRoutes = require('./routes/lookbookRoutes');
const baseColorRoutes = require('./routes/baseColorRoutes');

const adminProductRoutes = require('./routes/productRoutes');
const adminCategoryRoutes = require('./routes/categoryRoutes');
const adminBrandRoutes = require('./routes/brandRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const adminPromoCodeRoutes = require('./routes/adminPromoCodeRoutes');
const publicPromoCodeRoutes = require('./routes/publicPromoCodeRoutes');
const userAddressRoutes = require('./routes/userAddressRoutes');

const paypalRoutes = require('./routes/paypalRoutes');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log(`MongoDB Connected successfully! Database: ${mongoose.connection.name}`);
    console.log('Ensuring all database indexes are synchronized...');
    await mongoose.connection.syncIndexes();
    console.log('Database indexes are synchronized.');

  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  });


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/public/products', publicProductRoutes);
app.use('/api/public/categories', publicCategoryRoutes);
app.use('/api/public/brands', publicBrandRoutes);
app.use('/api/public/languages', languageRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/colors', baseColorRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wishlist', wishlistRoutes); // << USE NEW ROUTES
app.use('/api/lookbooks', lookbookRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/admin/brands', adminBrandRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/languages', languageRoutes);
app.use('/api/admin/upload', uploadRoutes);
app.use('/api/admin/promocodes', adminPromoCodeRoutes);
app.use('/api/public/promocode', publicPromoCodeRoutes);
app.use('/api/user/addresses', userAddressRoutes);

app.use('/api/paypal', paypalRoutes);
app.get('/', (req, res) => res.send('Obscurite Backend API is active and running!'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
