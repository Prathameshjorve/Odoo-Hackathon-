const axios = require('axios');
const crypto = require('crypto');

/**
 * Process a refund via Razorpay REST API using basic auth.
 * Supports acting on behalf of connected accounts via header "X-Razorpay-Account"
 * @param {string} paymentId
 * @param {number} amount - amount in cents/paise depending on currency (Razorpay expects paise)
 * @param {string} idempotencyKey
 * @param {object} options - { keyId, keySecret, connectedAccountId }
 */
async function processRefund(paymentId, amount, idempotencyKey, options = {}) {
  if (!paymentId) throw new Error('paymentId required');
  const keyId = options.keyId || process.env.RAZORPAY_KEY_ID;
  const keySecret = options.keySecret || process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error('Razorpay keys not configured');

  const url = `https://api.razorpay.com/v1/payments/${paymentId}/refund`;

  const headers = {
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) headers['X-Razorpay-Idempotency'] = idempotencyKey;
  if (options.connectedAccountId) headers['X-Razorpay-Account'] = options.connectedAccountId;

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  headers['Authorization'] = `Basic ${auth}`;

  const body = {};
  if (typeof amount === 'number' && amount > 0) body.amount = amount;

  try {
    // In development, allow a mocked refund to avoid hitting real Razorpay
    if (process.env.NODE_ENV === 'development' && (!keyId || !keySecret || String(paymentId).startsWith('pay_test'))) {
      return { id: `rf_mock_${Date.now()}`, payment_id: paymentId, amount: body.amount || null, status: 'processed', mocked: true };
    }

    const resp = await axios.post(url, body, { headers });
    return resp.data;
  } catch (err) {
    const msg = err.response && err.response.data ? err.response.data : err.message;
    const error = new Error('Razorpay refund failed');
    error.details = msg;
    throw error;
  }
}

module.exports = { processRefund };
