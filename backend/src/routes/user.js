const express = require('express');
const requireAuth = require('../middlewares/requireAuth');
const {
  getProfile,
  getMe,
  updateProfile,
  deleteAccount,
} = require('../controllers/userController');

const router = express.Router();

// All user routes require authentication
router.use(requireAuth);

// Get current user profile
router.get('/me', getMe);

// Update user profile
router.put('/update', updateProfile);

// Delete user account
router.delete('/delete', deleteAccount);

module.exports = router;
