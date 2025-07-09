// backend-api/routes/userAddressRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

router.use(authMiddleware); // All routes here require authentication

// GET /api/user/addresses - Get all addresses for the logged-in user
router.get('/', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('addresses defaultShippingAddressId defaultBillingAddressId').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({
      addresses: user.addresses || [],
      defaultShippingAddressId: user.defaultShippingAddressId,
      defaultBillingAddressId: user.defaultBillingAddressId
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/user/addresses - Add a new address
router.post('/', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const newAddressData = req.body; // Expects fields from userAddressSchema

    // If this new address is marked as default, unset other defaults
    if (newAddressData.isDefaultShipping) {
      user.addresses.forEach(addr => addr.isDefaultShipping = false);
    }
    if (newAddressData.isDefaultBilling) {
      user.addresses.forEach(addr => addr.isDefaultBilling = false);
    }

    const newAddressSubDoc = user.addresses.create(newAddressData); // Create subdocument
    user.addresses.push(newAddressSubDoc);

    await user.save(); // This will trigger the pre-save hook for default IDs

    // Find the newly added address (it will have an _id now) to return
    const addedAddress = user.addresses.id(newAddressSubDoc._id);
    res.status(201).json(addedAddress);

  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: "Validation Error", errors: error.errors });
    }
    next(error);
  }
});

// GET /api/user/addresses/:addressId - Get a specific address
router.get('/:addressId', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const address = user.addresses.id(req.params.addressId);
    if (!address) return res.status(404).json({ message: 'Address not found.' });

    res.json(address);
  } catch (error) {
    next(error);
  }
});


// PUT /api/user/addresses/:addressId - Update an existing address
router.put('/:addressId', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const address = user.addresses.id(req.params.addressId);
    if (!address) return res.status(404).json({ message: 'Address not found.' });

    const updateData = req.body;

    // If updating an address to be default, unset other defaults
    if (updateData.isDefaultShipping && !address.isDefaultShipping) { // Check if it's changing to default
      user.addresses.forEach(addr => { if (addr._id.toString() !== req.params.addressId) addr.isDefaultShipping = false; });
    }
    if (updateData.isDefaultBilling && !address.isDefaultBilling) {
      user.addresses.forEach(addr => { if (addr._id.toString() !== req.params.addressId) addr.isDefaultBilling = false; });
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      address[key] = updateData[key];
    });

    await user.save(); // Triggers pre-save hook
    res.json(user.addresses.id(req.params.addressId)); // Return updated address
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: "Validation Error", errors: error.errors });
    }
    next(error);
  }
});

// DELETE /api/user/addresses/:addressId - Delete an address
router.delete('/:addressId', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const address = user.addresses.id(req.params.addressId);
    if (!address) return res.status(404).json({ message: 'Address not found.' });

    // If deleting a default address, clear the default ID reference
    if (address.isDefaultShipping && user.defaultShippingAddressId?.toString() === address._id.toString()) {
      user.defaultShippingAddressId = null;
    }
    if (address.isDefaultBilling && user.defaultBillingAddressId?.toString() === address._id.toString()) {
      user.defaultBillingAddressId = null;
    }

    address.remove(); // Mongoose subdocument remove method
    await user.save();
    res.json({ message: 'Address deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/user/addresses/set-default/:addressId - Set an address as default
// Type can be 'shipping' or 'billing'
router.put('/set-default/:addressId', async (req, res, next) => {
  const { type } = req.body; // 'shipping' or 'billing'
  if (!type || !['shipping', 'billing'].includes(type)) {
    return res.status(400).json({ message: 'Invalid type. Must be "shipping" or "billing".' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const addressToSetDefault = user.addresses.id(req.params.addressId);
    if (!addressToSetDefault) return res.status(404).json({ message: 'Address not found.' });

    user.addresses.forEach(addr => {
      if (type === 'shipping') addr.isDefaultShipping = false;
      if (type === 'billing') addr.isDefaultBilling = false;
    });

    if (type === 'shipping') addressToSetDefault.isDefaultShipping = true;
    if (type === 'billing') addressToSetDefault.isDefaultBilling = true;

    await user.save(); // This will trigger pre-save hook to update defaultAddressId fields
    res.json({
      message: `Address set as default ${type}.`,
      addresses: user.addresses,
      defaultShippingAddressId: user.defaultShippingAddressId,
      defaultBillingAddressId: user.defaultBillingAddressId
    });
  } catch (error) {
    next(error);
  }
});


module.exports = router;
