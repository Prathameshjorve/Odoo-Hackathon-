const express = require('express');
const requireAuth = require('../middlewares/requireAuth');
const {
    getSessions,
    getCurrentSessionDetails,
    revokeSession,
    revokeOtherSessions,
    revokeAllSessions,
} = require('../controllers/sessionController');

const router = express.Router();

// All session routes require authentication
router.use(requireAuth);

// Get all active sessions
router.get('/', getSessions);

// Get current session details
router.get('/current', getCurrentSessionDetails);

// Revoke a specific session
router.delete('/:sessionId', revokeSession);

// Revoke all other sessions (keep current)
router.post('/revoke-others', revokeOtherSessions);

// Revoke all sessions (logout from all devices)
router.post('/revoke-all', revokeAllSessions);

module.exports = router;
