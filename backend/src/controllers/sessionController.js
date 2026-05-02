const {
    getUserActiveSessions,
    revokeSessionById,
    revokeAllUserRefreshTokens,
    getCurrentSession,
} = require('../lib/auth');

/**
 * Get all active sessions for the current user
 */
async function getSessions(req, res) {
    try {
        const userId = req.user.id;

        // Get all active sessions
        const sessions = await getUserActiveSessions(userId);

        // Get current session ID (from refresh token in cookie, body, query, or header)
        const refreshToken = req.cookies.refreshToken ||
            req.body.refreshToken ||
            req.query.refreshToken ||
            req.headers['x-refresh-token'];
        let currentSessionId = null;

        if (refreshToken) {
            const currentSession = await getCurrentSession(refreshToken);
            if (currentSession) {
                currentSessionId = currentSession.id;
            }
        }

        // Mark current session in the response
        const sessionsWithCurrent = sessions.map(session => ({
            ...session,
            isCurrent: session.id === currentSessionId,
        }));

        res.status(200).json({
            success: true,
            data: {
                sessions: sessionsWithCurrent,
                totalSessions: sessions.length,
            },
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching sessions.',
        });
    }
}

/**
 * Get current session details
 */
async function getCurrentSessionDetails(req, res) {
    try {
        const userId = req.user.id;
        // Accept refresh token from cookie, body, query param, or custom header
        const refreshToken = req.cookies.refreshToken ||
            req.body.refreshToken ||
            req.query.refreshToken ||
            req.headers['x-refresh-token'];

        // If refresh token is provided, get that specific session
        if (refreshToken) {
            const session = await getCurrentSession(refreshToken);

            if (!session || session.revoked) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired session.',
                });
            }

            // Verify this session belongs to the authenticated user
            if (session.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized access to session.',
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    session: {
                        ...session,
                        isCurrent: true,
                    },
                },
            });
        }

        // If no refresh token, return the most recently used active session
        const sessions = await getUserActiveSessions(userId);

        if (sessions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No active sessions found. Please login to create a session.',
            });
        }

        // Return the most recently used session (first in the array since it's ordered by lastUsedAt desc)
        const mostRecentSession = sessions[0];

        res.status(200).json({
            success: true,
            data: {
                session: {
                    ...mostRecentSession,
                    isCurrent: false, // We can't be certain it's the current one without refresh token
                },
            },
            message: 'Showing most recently used session. Include refresh token for exact current session.',
        });
    } catch (error) {
        console.error('Get current session error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching session details.',
        });
    }
}

/**
 * Revoke a specific session
 */
async function revokeSession(req, res) {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required.',
            });
        }

        // Check if trying to revoke current session
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
        if (refreshToken) {
            const currentSession = await getCurrentSession(refreshToken);
            if (currentSession && currentSession.id === sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot revoke current session. Use logout endpoint instead.',
                });
            }
        }

        // Revoke the session
        const revoked = await revokeSessionById(sessionId, userId);

        if (!revoked) {
            return res.status(404).json({
                success: false,
                message: 'Session not found or already revoked.',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Session revoked successfully.',
        });
    } catch (error) {
        console.error('Revoke session error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while revoking the session.',
        });
    }
}

/**
 * Revoke all sessions except the current one
 */
async function revokeOtherSessions(req, res) {
    try {
        const userId = req.user.id;
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'No active session found.',
            });
        }

        // Get current session
        const currentSession = await getCurrentSession(refreshToken);

        if (!currentSession) {
            return res.status(400).json({
                success: false,
                message: 'Invalid current session.',
            });
        }

        // Get all sessions and revoke all except current
        const sessions = await getUserActiveSessions(userId);

        let revokedCount = 0;
        for (const session of sessions) {
            if (session.id !== currentSession.id) {
                await revokeSessionById(session.id, userId);
                revokedCount++;
            }
        }

        res.status(200).json({
            success: true,
            message: `Successfully revoked ${revokedCount} other session(s).`,
            data: {
                revokedCount,
            },
        });
    } catch (error) {
        console.error('Revoke other sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while revoking other sessions.',
        });
    }
}

/**
 * Revoke all sessions (logout from all devices)
 */
async function revokeAllSessions(req, res) {
    try {
        const userId = req.user.id;

        // Revoke all refresh tokens
        await revokeAllUserRefreshTokens(userId);

        // Clear cookie
        res.clearCookie('refreshToken');

        res.status(200).json({
            success: true,
            message: 'Successfully logged out from all devices.',
        });
    } catch (error) {
        console.error('Revoke all sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while revoking all sessions.',
        });
    }
}

module.exports = {
    getSessions,
    getCurrentSessionDetails,
    revokeSession,
    revokeOtherSessions,
    revokeAllSessions,
};
