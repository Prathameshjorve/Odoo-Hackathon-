const express = require('express');
const requireAuth = require('../middlewares/requireAuth');
const {
  getProfile,
  getMe,
  updateProfile,
  deleteAccount,
  convertToOrganization,
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

// Convert USER to ORGANIZATION
router.post('/convert-to-organization', convertToOrganization);

module.exports = router;
