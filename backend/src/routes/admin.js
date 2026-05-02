const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/requireAuth');
const {
    isAdmin,
    getAdminStats,
    getAllUsers,
    getReports,
    getRecentActivity,
    deleteUser,
} = require('../controllers/adminController');

// All admin routes require authentication and admin privileges
router.use(requireAuth);
router.use(isAdmin);

/**
 * GET /admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', getAdminStats);

/**
 * GET /admin/users
 * Get all users with pagination and filters
 * Query params: page, limit, role, search, status
 */
router.get('/users', getAllUsers);

/**
 * GET /admin/reports
 * Get reports and analytics data
 * Query params: days (default: 30)
 */
router.get('/reports', getReports);

/**
 * GET /admin/activity
 * Get recent activity for admin dashboard
 * Query params: limit (default: 10)
 */
router.get('/activity', getRecentActivity);

/**
 * DELETE /admin/users/:userId
 * Delete a user by ID
 */
router.delete('/users/:userId', deleteUser);

module.exports = router;
