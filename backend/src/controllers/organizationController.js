const prisma = require('../lib/prisma');
const { notifyOrganizationMembers } = require('../lib/notificationHelper');

/**
 * Update organization (ADMIN only)
 */
async function updateOrganization(req, res) {
    try {
        const userId = req.user.id;
        const { name, location, description, businessHours } = req.body;

        // Fetch admin user with organization
        const adminUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { adminOrganization: true },
        });

        // Check if user is organization admin
        if (!adminUser || adminUser.role !== 'ORGANIZATION' || adminUser.isMember) {
            return res.status(403).json({
                success: false,
                message: 'Only organization admins can update organization.',
            });
        }

        if (!adminUser.adminOrganization) {
            return res.status(400).json({
                success: false,
                message: 'User does not have an organization.',
            });
        }

        const organizationId = adminUser.adminOrganization.id;

        // Build update data object
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (location !== undefined) updateData.location = location;
        if (description !== undefined) updateData.description = description;
        if (businessHours !== undefined) updateData.businessHours = businessHours;

        // Update organization
        const updatedOrganization = await prisma.organization.update({
            where: { id: organizationId },
            data: updateData,
            select: {
                id: true,
                name: true,
                location: true,
                description: true,
                businessHours: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        // Notify organization members about settings update
        await notifyOrganizationMembers({
            organizationId,
            type: 'ORGANIZATION_UPDATED',
            title: 'Organization Settings Updated',
            message: `Organization settings have been updated by the admin.`,
            relatedId: organizationId,
            relatedType: 'organization',
            actionUrl: '/dashboard/org/settings',
            excludeUserId: userId,
        });

        res.status(200).json({
            success: true,
            message: 'Organization updated successfully.',
            data: { organization: updatedOrganization },
        });
    } catch (error) {
        console.error('Update organization error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating organization.',
        });
    }
}

/**
 * Get organization reports and analytics (ADMIN only)
 */
async function getReports(req, res) {
    try {
        const userId = req.user.id;
        const { days = 30 } = req.query;
        const daysCount = parseInt(days);

        // Fetch admin user with organization
        const adminUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { adminOrganization: true },
        });

        // Check if user is organization admin
        if (!adminUser || adminUser.role !== 'ORGANIZATION' || adminUser.isMember) {
            return res.status(403).json({
                success: false,
                message: 'Only organization admins can access reports.',
            });
        }

        if (!adminUser.adminOrganization) {
            return res.status(400).json({
                success: false,
                message: 'User does not have an organization.',
            });
        }

        const organizationId = adminUser.adminOrganization.id;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysCount);

        // Fetch all bookings for the organization in the period
        const bookings = await prisma.booking.findMany({
            where: {
                appointment: {
                    organizationId: organizationId,
                },
                createdAt: { gte: startDate },
            },
            include: {
                appointment: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        // Summary stats
        const stats = {
            total: bookings.length,
            confirmed: bookings.filter(b => b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'COMPLETED').length,
            cancelled: bookings.filter(b => b.bookingStatus === 'CANCELLED').length,
            revenue: bookings.filter(b => b.paymentStatus === 'PAID').reduce((sum, b) => sum + (b.totalAmount || 0), 0),
        };

        // Chart data generation
        const chartData = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if (daysCount <= 30) {
            // Daily breakdown for last 30 days
            const dailyMap = {};
            for (let i = 0; i < daysCount; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                dailyMap[dateStr] = { bookings: 0, revenue: 0 };
            }

            bookings.forEach(booking => {
                const dateStr = booking.createdAt.toISOString().split('T')[0];
                if (dailyMap[dateStr] !== undefined) {
                    dailyMap[dateStr].bookings++;
                    if (booking.paymentStatus === 'PAID') {
                        dailyMap[dateStr].revenue += (booking.totalAmount || 0);
                    }
                }
            });

            Object.keys(dailyMap).sort().forEach(date => {
                const d = new Date(date);
                chartData.push({
                    name: `${d.getDate()} ${monthNames[d.getMonth()]}`,
                    bookings: dailyMap[date].bookings,
                    revenue: dailyMap[date].revenue,
                });
            });
        } else {
            // Monthly breakdown for longer periods
            const monthlyMap = {};
            bookings.forEach(booking => {
                const date = booking.createdAt;
                const key = `${date.getFullYear()}-${date.getMonth()}`;
                const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
                
                if (!monthlyMap[key]) {
                    monthlyMap[key] = { label, bookings: 0, revenue: 0, sortKey: date.getTime() };
                }
                monthlyMap[key].bookings++;
                if (booking.paymentStatus === 'PAID') {
                    monthlyMap[key].revenue += (booking.totalAmount || 0);
                }
            });

            Object.values(monthlyMap)
                .sort((a, b) => a.sortKey - b.sortKey)
                .forEach(item => {
                    chartData.push({
                        name: item.label,
                        bookings: item.bookings,
                        revenue: item.revenue,
                    });
                });
        }

        // Top appointments
        const appointmentStats = {};
        bookings.forEach(booking => {
            const title = booking.appointment.title;
            if (!appointmentStats[title]) {
                appointmentStats[title] = { title, count: 0, revenue: 0 };
            }
            appointmentStats[title].count++;
            if (booking.paymentStatus === 'PAID') {
                appointmentStats[title].revenue += (booking.totalAmount || 0);
            }
        });

        const topAppointments = Object.values(appointmentStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        res.json({
            success: true,
            data: {
                stats,
                chartData,
                topAppointments,
            },
        });
    } catch (error) {
        console.error('Get organization reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch organization reports.',
        });
    }
}

module.exports = {
    updateOrganization,
    getReports,
};
