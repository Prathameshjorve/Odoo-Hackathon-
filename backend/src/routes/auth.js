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
const otpAuthController = require('../controllers/otpAuthController');
const { connectRazorpay, razorpayCallback } = require('../controllers/razorpayController');
const requireAuth = require('../middlewares/requireAuth');

const router = express.Router();

// Register new user
router.post('/register', register);

// OTP-based register (two-step)
router.post('/register-otp', otpAuthController.register);

// Verify email using OTP
router.post('/verify-otp', verifyOtp);

// Verify email (legacy link-based verification - still supported)
router.get('/verify-email', verifyEmail);

// (resend-otp route handled by OTP controller)

// Resend verification email (legacy - still supported)
router.post('/resend-verification-email', resendVerificationEmail);

// Login
router.post('/login', login);

// OTP-based login (two-step)
router.post('/login-otp', otpAuthController.login);

// Refresh access token
router.post('/refresh-token', refreshToken);

// Logout
router.post('/logout', logout);

// Request OTP for password reset
router.post('/request-password-reset', requestPasswordReset);

// Reset password using OTP
router.post('/reset-password', resetPassword);

// OTP-based password reset (two-step)
router.post('/forgot-password-otp', otpAuthController.forgotPassword);

// Verify forgot-password OTP only
router.post('/verify-forgot-password-otp', otpAuthController.verifyForgotPasswordOtp);

// Complete password reset after OTP has been verified
router.post('/complete-forgot-password-reset', otpAuthController.completeForgotPasswordReset);

// Resend OTP (generic)
router.post('/resend-otp', otpAuthController.resendOtp);

// Razorpay OAuth connect (organization admin)
// Authentication is handled inside connectRazorpay to support token via query string
router.get('/razorpay/connect', connectRazorpay);

// Razorpay OAuth callback
router.get('/razorpay/callback', razorpayCallback);

module.exports = router;
