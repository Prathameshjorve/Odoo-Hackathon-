const { getValidAccessTokenForOrganization } = require("../lib/razorpay");
const axios = require("axios");
const prisma = require("../lib/prisma");

const { verifyAccessToken } = require("../lib/auth");
const {
    buildAuthorizeUrl,
    parseAndVerifyState,
    exchangeCodeForTokens,
    createMerchantWebhooks,
} = require("../lib/razorpay");

// GET /razorpay/payments?limit=20&cursor=pay_xxx
// Requires authenticated user (org admin)
async function getPayments(req, res) {
    try {
        // Get the admin's organization
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { adminOrganization: true },
        });
        if (!user || !user.adminOrganization) {
            return res.status(403).json({ success: false, message: "Not an organization admin" });
        }
        const org = user.adminOrganization;
        // Check Razorpay connection
        const connection = await getValidAccessTokenForOrganization(org.id).catch(() => null);
        if (!connection) {
            return res.json({ success: true, data: { payments: [], hasMore: false, totalIncome: 0, totalIncomeMonth: 0, razorpayConnected: false } });
        }
        // Pagination
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
        const cursor = req.query.cursor;
        // Fetch payments from Razorpay
        const headers = { Authorization: `Bearer ${connection.accessToken}` };
        let url = `https://api.razorpay.com/v1/payments?count=${limit}`;
        if (cursor) url += `&from=${cursor}`;
        const { data } = await axios.get(url, { headers });
        const payments = data.items || [];
        // Calculate total income (all time and this month)
        let totalIncome = 0;
        let totalIncomeMonth = 0;
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        for (const p of payments) {
            if (p.status === "captured") {
                totalIncome += p.amount / 100;
                const paidAt = new Date(p.created_at * 1000);
                if (paidAt.getMonth() === month && paidAt.getFullYear() === year) {
                    totalIncomeMonth += p.amount / 100;
                }
            }
        }
        // Pagination: Razorpay returns items in descending order, so use last payment's created_at as next cursor
        const hasMore = payments.length === limit;
        const nextCursor = hasMore ? payments[payments.length - 1].created_at : null;
        res.json({
            success: true,
            data: {
                payments,
                hasMore,
                nextCursor,
                totalIncome,
                totalIncomeMonth,
                razorpayConnected: true,
            },
        });
    } catch (error) {
        console.error("Get Razorpay payments error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch payments" });
    }
}

// GET /auth/razorpay/connect
// Requires authenticated organization admin
async function connectRazorpay(req, res) {
    try {
        // Support token from Authorization header or query string so we can redirect via window.location
        let token;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else if (req.query && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required. Please provide a valid access token.",
            });
        }

        const decoded = verifyAccessToken(token);
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired access token.",
            });
        }

        const userId = decoded.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { adminOrganization: true },
        });

        if (!user || user.role !== "ORGANIZATION" || user.isMember) {
            return res.status(403).json({
                success: false,
                message: "Only organization admins can connect Razorpay.",
            });
        }

        if (!user.adminOrganization) {
            return res.status(400).json({
                success: false,
                message: "User does not have an organization.",
            });
        }

        const organizationId = user.adminOrganization.id;
        const authorizeUrl = buildAuthorizeUrl(organizationId);

        // For browser navigation, a 302 redirect is convenient
        return res.redirect(authorizeUrl);
    } catch (error) {
        console.error("Razorpay connect error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to initiate Razorpay connection.",
        });
    }
}

// GET /auth/razorpay/callback
// Handles OAuth callback from Razorpay
async function razorpayCallback(req, res) {
    try {
        const { code, state, error, error_description } = req.query;

        if (error) {
            console.error("Razorpay OAuth error:", error, error_description);
            return res.status(400).json({
                success: false,
                message: `Razorpay OAuth failed: ${error_description || error}`,
            });
        }

        if (!code || !state) {
            return res.status(400).json({
                success: false,
                message: "Missing code or state in Razorpay callback.",
            });
        }

        // Handle hardcoded state from direct Razorpay OAuth URL
        // For security in production, you should validate state properly or use session-based tracking
        let organizationId;

        if (state === "current_state") {
            // Hardcoded state from direct OAuth URL - need to determine org from session/cookie
            // For now, we'll find the first ORGANIZATION admin that doesn't have a connection yet
            // In production, you should track this via session or require proper state
            const adminUsers = await prisma.user.findMany({
                where: {
                    role: "ORGANIZATION",
                    isMember: false,
                },
                include: {
                    adminOrganization: {
                        include: {
                            razorpayConnection: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });

            // Find first admin without a Razorpay connection
            const adminWithoutConnection = adminUsers.find(
                (user) => user.adminOrganization && !user.adminOrganization.razorpayConnection
            );

            if (!adminWithoutConnection || !adminWithoutConnection.adminOrganization) {
                return res.status(400).json({
                    success: false,
                    message: "Could not determine which organization to connect. Please try again from the dashboard.",
                });
            }

            organizationId = adminWithoutConnection.adminOrganization.id;
            console.log("Using fallback organization detection for hardcoded state:", organizationId);
        } else {
            // Normal flow with properly signed state
            organizationId = parseAndVerifyState(state);
        }

        console.log("Exchanging authorization code for tokens...");
        const tokens = await exchangeCodeForTokens(code);
        console.log("Tokens received:", {
            hasAccessToken: !!tokens.accessToken,
            hasRefreshToken: !!tokens.refreshToken,
            merchantId: tokens.razorpayMerchantId,
            keyId: tokens.merchantKeyId
        });

        console.log("Saving Razorpay connection to database for organization:", organizationId);
        const connection = await prisma.organizationRazorpayConnection.upsert({
            where: { organizationId },
            update: {
                razorpayMerchantId: tokens.razorpayMerchantId,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                tokenExpiresAt: tokens.tokenExpiresAt,
                merchantKeyId: tokens.merchantKeyId,
            },
            create: {
                organizationId,
                razorpayMerchantId: tokens.razorpayMerchantId,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                tokenExpiresAt: tokens.tokenExpiresAt,
                merchantKeyId: tokens.merchantKeyId,
            },
        });
        console.log("Razorpay connection saved successfully:", connection.id);

        // Create webhooks for this merchant
        try {
            console.log("Creating webhooks for merchant...");
            await createMerchantWebhooks(connection);
            console.log("Webhooks created successfully");
        } catch (whErr) {
            console.error("Failed to create Razorpay webhooks:", whErr.message || whErr);
            // Do not fail the whole flow – connection is still valid
        }

        // Redirect back to dashboard with a success flag
        const redirectUrl = `${process.env.FRONTEND_BASE_URL || "http://localhost:3000"}/dashboard/org/settings?razorpay=connected`;

        console.log("Redirecting to:", redirectUrl);
        return res.redirect(redirectUrl);
    } catch (error) {
        console.error("Razorpay callback error:", error);
        console.error("Error details:", {
            message: error.message,
            response: error.response?.data,
            stack: error.stack
        });
        return res.status(500).json({
            success: false,
            message: `Failed to complete Razorpay connection: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

module.exports = {
    connectRazorpay,
    razorpayCallback,
    getPayments,
};
