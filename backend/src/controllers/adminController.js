const prisma = require('../lib/prisma');

// Admin emails list - these users get super admin access
const ADMIN_EMAILS = [
    "aryan@devally.in",
];

/**
 * Middleware to check if user is admin
 */
const isAdmin = (req, res, next) => {
    if (!req.user || !ADMIN_EMAILS.includes(req.user.email.toLowerCase())) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.',
        });
    }
    next();
};

/**
 * Get admin dashboard statistics
 */
async function getAdminStats(req, res) {
    try {
        // Get total users count
        const totalUsers = await prisma.user.count();

        // Get users by role
        const usersByRole = await prisma.user.groupBy({
            by: ['role'],
            _count: { id: true },
        });

        // Get total organizations
        const totalOrganizations = await prisma.organization.count();

        // Get total appointments
        const totalAppointments = await prisma.appointment.count();

        // Get total bookings
        const totalBookings = await prisma.booking.count();

        // Get bookings by status
        const bookingsByStatus = await prisma.booking.groupBy({
            by: ['bookingStatus'],
            _count: { id: true },
        });

        // Get verified users count
        const verifiedUsers = await prisma.user.count({
            where: { emailVerified: true },
        });

        // Get users created in last 30 days (active users approximation)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentUsers = await prisma.user.count({
            where: {
                createdAt: { gte: thirtyDaysAgo },
            },
        });

        // Get bookings created in last 30 days
        const recentBookings = await prisma.booking.count({
            where: {
                createdAt: { gte: thirtyDaysAgo },
            },
        });

        // Calculate revenue (sum of paid bookings)
        const revenueData = await prisma.booking.aggregate({
            where: {
                paymentStatus: 'PAID',
                createdAt: { gte: thirtyDaysAgo },
            },
            _sum: { totalAmount: true },
        });

        // Parse booking status counts
        const statusCounts = {
            pending: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
        };
        bookingsByStatus.forEach(item => {
            statusCounts[item.bookingStatus.toLowerCase()] = item._count.id;
        });

        res.json({
            success: true,
            data: {
                totalUsers,
                totalOrganizations,
                totalAppointments,
                totalBookings,
                verifiedUsers,
                activeUsers: recentUsers, // Users who joined in last 30 days
                pendingAppointments: statusCounts.pending,
                confirmedAppointments: statusCounts.confirmed,
                completedAppointments: statusCounts.completed,
                cancelledAppointments: statusCounts.cancelled,
                revenueThisMonth: revenueData._sum.totalAmount || 0,
                recentBookings,
            },
        });
    } catch (error) {
        console.error('Get admin stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admin statistics.',
        });
    }
}

/**
 * Get all users with pagination and filters
 */
async function getAllUsers(req, res) {
    try {
        const { page = 1, limit = 50, role, search, status } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build where clause
        const where = {};
        
        if (role && role !== 'all') {
            where.role = role;
        }
        
        if (status === 'active') {
            where.emailVerified = true;
        } else if (status === 'inactive') {
            where.emailVerified = false;
        }
        
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Get users with organization info
        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                emailVerified: true,
                isMember: true,
                createdAt: true,
                updatedAt: true,
                organization: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                adminOrganization: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit),
        });

        // Get total count
        const total = await prisma.user.count({ where });

        // Transform users to include isActive flag
        const transformedUsers = users.map(user => ({
            ...user,
            isActive: user.emailVerified,
            organization: user.organization || user.adminOrganization,
        }));

        res.json({
            success: true,
            data: {
                users: transformedUsers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit)),
                },
            },
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users.',
        });
    }
}

/**
 * Get reports and analytics data
 */
async function getReports(req, res) {
    try {
        const { days = 30 } = req.query;
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));

        // Get total appointments in period
        const totalAppointments = await prisma.booking.count({
            where: { createdAt: { gte: daysAgo } },
        });

        // Get bookings by status in period
        const bookingsByStatus = await prisma.booking.groupBy({
            by: ['bookingStatus'],
            where: { createdAt: { gte: daysAgo } },
            _count: { id: true },
        });

        // Calculate status counts
        let completedAppointments = 0;
        let cancelledAppointments = 0;
        bookingsByStatus.forEach(item => {
            if (item.bookingStatus === 'COMPLETED') completedAppointments = item._count.id;
            if (item.bookingStatus === 'CANCELLED') cancelledAppointments = item._count.id;
        });

        // Get revenue data
        const revenueData = await prisma.booking.aggregate({
            where: {
                paymentStatus: 'PAID',
                createdAt: { gte: daysAgo },
            },
            _sum: { totalAmount: true },
            _count: { id: true },
        });

        const totalRevenue = revenueData._sum.totalAmount || 0;
        const paidBookings = revenueData._count.id || 0;
        const averageBookingValue = paidBookings > 0 ? totalRevenue / paidBookings : 0;

        // Get bookings by hour (for peak hours chart)
        const allBookings = await prisma.booking.findMany({
            where: { createdAt: { gte: daysAgo } },
            select: { startTime: true },
        });

        const hourCounts = {};
        allBookings.forEach(booking => {
            const hour = new Date(booking.startTime).getHours();
            const hourLabel = `${hour}:00`;
            hourCounts[hourLabel] = (hourCounts[hourLabel] || 0) + 1;
        });

        // Convert to array and sort
        const peakHours = Object.entries(hourCounts)
            .map(([hour, count]) => ({ hour, count }))
            .sort((a, b) => {
                const hourA = parseInt(a.hour);
                const hourB = parseInt(b.hour);
                return hourA - hourB;
            })
            .slice(0, 8); // Top 8 hours

        // Get organization utilization (bookings per organization)
        const orgBookings = await prisma.booking.groupBy({
            by: ['appointmentId'],
            where: { createdAt: { gte: daysAgo } },
            _count: { id: true },
        });

        // Get organization names for these appointments
        const appointmentIds = orgBookings.map(b => b.appointmentId);
        const appointments = await prisma.appointment.findMany({
            where: { id: { in: appointmentIds } },
            select: {
                id: true,
                organization: {
                    select: { name: true },
                },
            },
        });

        const appointmentOrgMap = {};
        appointments.forEach(apt => {
            appointmentOrgMap[apt.id] = apt.organization?.name || 'Unknown';
        });

        // Aggregate by organization
        const orgUtilization = {};
        orgBookings.forEach(booking => {
            const orgName = appointmentOrgMap[booking.appointmentId] || 'Unknown';
            orgUtilization[orgName] = (orgUtilization[orgName] || 0) + booking._count.id;
        });

        // Calculate percentages (relative to max)
        const maxBookings = Math.max(...Object.values(orgUtilization), 1);
        const providerUtilization = Object.entries(orgUtilization)
            .map(([name, count]) => ({
                name,
                percentage: Math.round((count / maxBookings) * 100),
                bookings: count,
            }))
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 5); // Top 5 providers

        // Get monthly trends (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyBookings = await prisma.booking.findMany({
            where: { createdAt: { gte: sixMonthsAgo } },
            select: { createdAt: true },
        });

        const monthCounts = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        monthlyBookings.forEach(booking => {
            const date = new Date(booking.createdAt);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            const monthLabel = monthNames[date.getMonth()];
            
            if (!monthCounts[monthKey]) {
                monthCounts[monthKey] = { month: monthLabel, appointments: 0, sortKey: date.getTime() };
            }
            monthCounts[monthKey].appointments++;
        });

        const monthlyTrends = Object.values(monthCounts)
            .sort((a, b) => a.sortKey - b.sortKey)
            .map(({ month, appointments }) => ({ month, appointments }));

        res.json({
            success: true,
            data: {
                totalAppointments,
                completedAppointments,
                cancelledAppointments,
                totalRevenue,
                averageBookingValue: Math.round(averageBookingValue * 100) / 100,
                peakHours,
                providerUtilization,
                monthlyTrends,
            },
        });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reports.',
        });
    }
}

/**
 * Get recent activity for admin dashboard
 */
async function getRecentActivity(req, res) {
    try {
        const { limit = 10 } = req.query;

        // Get recent users
        const recentUsers = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });

        // Get recent bookings
        const recentBookings = await prisma.booking.findMany({
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: {
                id: true,
                bookingStatus: true,
                createdAt: true,
                user: {
                    select: { name: true },
                },
                appointment: {
                    select: { title: true },
                },
            },
        });

        // Get recent organizations
        const recentOrganizations = await prisma.organization.findMany({
            orderBy: { createdAt: 'desc' },
            take: 2,
            select: {
                id: true,
                name: true,
                createdAt: true,
            },
        });

        // Combine and format activities
        const activities = [];

        recentUsers.forEach(user => {
            activities.push({
                type: 'user_registered',
                icon: 'Users',
                text: `New user registered: ${user.name || user.email}`,
                time: user.createdAt,
                color: 'text-blue-600',
            });
        });

        recentBookings.forEach(booking => {
            activities.push({
                type: 'booking',
                icon: booking.bookingStatus === 'COMPLETED' ? 'CheckCircle2' : 'Calendar',
                text: booking.bookingStatus === 'COMPLETED' 
                    ? `Appointment completed: ${booking.appointment?.title}`
                    : `New booking: ${booking.appointment?.title}`,
                time: booking.createdAt,
                color: booking.bookingStatus === 'COMPLETED' ? 'text-green-600' : 'text-green-600',
            });
        });

        recentOrganizations.forEach(org => {
            activities.push({
                type: 'organization_registered',
                icon: 'Building2',
                text: `New organization: ${org.name}`,
                time: org.createdAt,
                color: 'text-purple-600',
            });
        });

        // Sort by time and limit
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        const limitedActivities = activities.slice(0, parseInt(limit));

        // Format time as relative
        const formatRelativeTime = (date) => {
            const now = new Date();
            const diff = now - new Date(date);
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);

            if (minutes < 1) return 'Just now';
            if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            return `${days} day${days > 1 ? 's' : ''} ago`;
        };

        const formattedActivities = limitedActivities.map(activity => ({
            ...activity,
            time: formatRelativeTime(activity.time),
        }));

        res.json({
            success: true,
            data: { activities: formattedActivities },
        });
    } catch (error) {
        console.error('Get recent activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent activity.',
        });
    }
}

/**
 * Delete a user by ID (admin only)
 */
async function deleteUser(req, res) {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required.',
            });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                adminOrganization: true,
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.',
            });
        }

        // Prevent deleting admin users
        if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete admin users.',
            });
        }

        // Delete user and related data in a transaction
        await prisma.$transaction(async (tx) => {
            // If user is an organization admin, delete the organization first
            if (user.adminOrganization) {
                // Delete all appointments for this organization
                await tx.appointment.deleteMany({
                    where: { organizationId: user.adminOrganization.id },
                });

                // Delete all resources for this organization
                await tx.resource.deleteMany({
                    where: { organizationId: user.adminOrganization.id },
                });

                // Remove organization members
                await tx.user.updateMany({
                    where: { 
                        organizationId: user.adminOrganization.id,
                        id: { not: userId },
                    },
                    data: {
                        organizationId: null,
                        isMember: false,
                    },
                });

                // Delete the organization
                await tx.organization.delete({
                    where: { id: user.adminOrganization.id },
                });
            }

            // Delete user's bookings
            await tx.booking.deleteMany({
                where: { userId },
            });

            // Delete user's notifications
            await tx.notification.deleteMany({
                where: { userId },
            });

            // Delete user's refresh tokens
            await tx.refreshToken.deleteMany({
                where: { userId },
            });

            // Delete user's email verification tokens
            await tx.emailVerificationToken.deleteMany({
                where: { userId },
            });

            // Delete user's password reset tokens
            await tx.passwordResetToken.deleteMany({
                where: { userId },
            });

            // Finally, delete the user
            await tx.user.delete({
                where: { id: userId },
            });
        });

        res.json({
            success: true,
            message: 'User deleted successfully.',
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user.',
        });
    }
}

module.exports = {
    isAdmin,
    getAdminStats,
    getAllUsers,
    getReports,
    getRecentActivity,
    deleteUser,
};
