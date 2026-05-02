const express = require('express');
const { getAllOrganizations, getOrganizationById } = require('../controllers/publicController');

const router = express.Router();

// Public routes - no authentication required
router.get('/organizations', getAllOrganizations);
router.get('/organizations/:id', getOrganizationById);

module.exports = router;
