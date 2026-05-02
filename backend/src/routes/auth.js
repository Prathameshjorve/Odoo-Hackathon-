const express = require('express');
const {
  register,
  verifyEmail,
  login,
  refreshToken,
  logout,
  requestPasswordReset,
  resetPassword,
  resendVerificationEmail,
} = require('../controllers/authController');
const { connectRazorpay, razorpayCallback } = require('../controllers/razorpayController');
const requireAuth = require('../middlewares/requireAuth');

const router = express.Router();

// Register new user
router.post('/register', register);

// Verify email
router.get('/verify-email', verifyEmail);

// Resend verification email
router.post('/resend-verification-email', resendVerificationEmail);

// Login
router.post('/login', login);

// Refresh access token
router.post('/refresh-token', refreshToken);

// Logout
router.post('/logout', logout);

// Request password reset
router.post('/request-password-reset', requestPasswordReset);

// Reset password
router.post('/reset-password', resetPassword);

// Razorpay OAuth connect (organization admin)
// Authentication is handled inside connectRazorpay to support token via query string
router.get('/razorpay/connect', connectRazorpay);

// Razorpay OAuth callback
router.get('/razorpay/callback', razorpayCallback);

module.exports = router;
