const express = require('express');
const {
  register,
  verifyEmail,
  verifyOtp,
  login,
  refreshToken,
  logout,
  requestPasswordReset,
  resetPassword,
  resendVerificationEmail,
  resendOtp,
} = require('../controllers/authController');
const { connectRazorpay, razorpayCallback } = require('../controllers/razorpayController');
const requireAuth = require('../middlewares/requireAuth');

const router = express.Router();

// Register new user
router.post('/register', register);

// Verify email using OTP
router.post('/verify-otp', verifyOtp);

// Verify email (legacy link-based verification - still supported)
router.get('/verify-email', verifyEmail);

// Resend OTP for email verification or password reset
router.post('/resend-otp', resendOtp);

// Resend verification email (legacy - still supported)
router.post('/resend-verification-email', resendVerificationEmail);

// Login
router.post('/login', login);

// Refresh access token
router.post('/refresh-token', refreshToken);

// Logout
router.post('/logout', logout);

// Request OTP for password reset
router.post('/request-password-reset', requestPasswordReset);

// Reset password using OTP
router.post('/reset-password', resetPassword);

// Razorpay OAuth connect (organization admin)
// Authentication is handled inside connectRazorpay to support token via query string
router.get('/razorpay/connect', connectRazorpay);

// Razorpay OAuth callback
router.get('/razorpay/callback', razorpayCallback);

module.exports = router;
