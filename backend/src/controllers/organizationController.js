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

module.exports = {
    updateOrganization,
};
