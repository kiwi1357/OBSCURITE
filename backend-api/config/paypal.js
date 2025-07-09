// backend-api/config/paypal.js
const paypal = require('@paypal/checkout-server-sdk');
require('dotenv').config(); // Ensure environment variables are loaded

// Determine environment
const environment = process.env.NODE_ENV === 'production'
  ? new paypal.core.LiveEnvironment(process.env.PAYPAL_LIVE_CLIENT_ID, process.env.PAYPAL_LIVE_CLIENT_SECRET)
  : new paypal.core.SandboxEnvironment(process.env.PAYPAL_SANDBOX_CLIENT_ID, process.env.PAYPAL_SANDBOX_CLIENT_SECRET);

const client = new paypal.core.PayPalHttpClient(environment);

module.exports = { client, paypal }; // Export paypal namespace for request objects
