const express = require('express');
const requireAuth = require('../middlewares/requireAuth');
const prisma = require('../lib/prisma');
const { hashPassword } = require('../lib/auth');
const { sendMemberInvitationEmail } = require('../lib/mailer');
const { createAppointment, getOrganizationAppointments, getSingleAppointment } = require('../controllers/appointmentController');
const { updateOrganization } = require('../controllers/organizationController');
const { createNotification, notifyOrganizationMembers } = require('../lib/notificationHelper');

const router = express.Router();

// All organization routes require authentication
router.use(requireAuth);

/**
 * Generate random password
 */
function generatePassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

/**
 * Add member to organization (ADMIN only)
 * Comprehensive validation for all edge cases
 */
router.post('/members', async (req, res) => {
    try {
        const userId = req.user.id;
        const { email } = req.body;

        // Validation 1: Check email is provided
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required.',
            });
        }

        // Validation 2: Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address.',
            });
        }

        // Normalize email (lowercase, trim)
        const normalizedEmail = email.toLowerCase().trim();

        // Fetch admin user with organization
        const adminUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { adminOrganization: true },
        });

        // Validation 3: Check if user is organization admin
        if (!adminUser || adminUser.role !== 'ORGANIZATION' || adminUser.isMember) {
            return res.status(403).json({
                success: false,
                message: 'Only organization admins can add members.',
            });
        }

        // Validation 4: Check if admin has an organization
        if (!adminUser.adminOrganization) {
            return res.status(400).json({
                success: false,
                message: 'You do not have an organization. Please create one first.',
            });
        }

        const organizationId = adminUser.adminOrganization.id;
        const organizationName = adminUser.adminOrganization.name;

        // Validation 5: Prevent adding self as member
        if (adminUser.email.toLowerCase() === normalizedEmail) {
            return res.status(400).json({
                success: false,
                message: 'You cannot add yourself as a member. You are the organization admin.',
            });
        }

        // Check if user already exists
        let memberUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: {
                adminOrganization: true,
                organization: true,
            },
        });

        if (memberUser) {
            // === EXISTING USER VALIDATIONS ===

            // Validation 6: Cannot add organization owner (admin)
            if (memberUser.role === 'ORGANIZATION' && !memberUser.isMember) {
                return res.status(400).json({
                    success: false,
                    message: 'This user already owns an organization and cannot be added as a member.',
                });
            }

            // Validation 7: Check if already member of THIS organization
            if (memberUser.organizationId === organizationId) {
                return res.status(400).json({
                    success: false,
                    message: 'This user is already a member of your organization.',
                });
            }

            // Validation 8: Check if member of ANOTHER organization
            if (memberUser.organizationId && memberUser.organizationId !== organizationId) {
                // Fetch the other organization name for better error message
                const otherOrg = memberUser.organization;
                return res.status(400).json({
                    success: false,
                    message: `This user is already a member of another organization${otherOrg ? ` (${otherOrg.name})` : ''}. A user can only belong to one organization at a time.`,
                });
            }

            // Validation 9: Only USER role can be converted to member
            if (memberUser.role !== 'USER') {
                return res.status(400).json({
                    success: false,
                    message: `Cannot add this user. User role is '${memberUser.role}'. Only users with 'USER' role can be added as members.`,
                });
            }

            // === ALL VALIDATIONS PASSED - Add existing USER as member ===
            memberUser = await prisma.user.update({
                where: { id: memberUser.id },
                data: {
                    role: 'ORGANIZATION',
                    isMember: true,
                    organizationId: organizationId,
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isMember: true,
                    createdAt: true,
                },
            });

            // Send notification email (user keeps existing password)
            try {
                await sendMemberInvitationEmail(
                    normalizedEmail,
                    organizationName,
                    'Use your existing password to login',
                    adminUser.name || 'Admin'
                );
            } catch (emailError) {
                console.error('Email send error:', emailError);
                // Don't fail the request if email fails - member is already added
            }

            // Notify the new member
            await createNotification({
                userId: memberUser.id,
                type: 'MEMBER_ADDED',
                title: 'Added to Organization',
                message: `You have been added to ${organizationName}.`,
                relatedId: organizationId,
                relatedType: 'organization',
                actionUrl: '/dashboard/org/settings',
            });

            // Notify other organization members
            await notifyOrganizationMembers({
                organizationId,
                type: 'MEMBER_ADDED',
                title: 'New Member Added',
                message: `${memberUser.name || memberUser.email} has been added to the organization.`,
                relatedId: memberUser.id,
                relatedType: 'user',
                actionUrl: '/dashboard/org/members',
                excludeUserId: memberUser.id,
            });

            return res.status(200).json({
                success: true,
                message: 'Existing user added as member successfully. Notification email sent.',
                data: { member: memberUser },
            });
        } else {
            // === NEW USER - Create account and add as member ===

            const generatedPassword = generatePassword();
            const hashedPassword = await hashPassword(generatedPassword);

            memberUser = await prisma.user.create({
                data: {
                    email: normalizedEmail,
                    password: hashedPassword,
                    name: normalizedEmail.split('@')[0], // Use email prefix as default name
                    role: 'ORGANIZATION',
                    isMember: true,
                    emailVerified: true, // Auto-verify for invited members
                    organizationId: organizationId,
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isMember: true,
                    createdAt: true,
                },
            });

            // Send invitation email with credentials
            try {
                await sendMemberInvitationEmail(
                    normalizedEmail,
                    organizationName,
                    generatedPassword,
                    adminUser.name || 'Admin'
                );
            } catch (emailError) {
                console.error('Email send error:', emailError);
                // Don't fail the request if email fails - member is already created
            }

            // Notify the new member
            await createNotification({
                userId: memberUser.id,
                type: 'MEMBER_ADDED',
                title: 'Welcome to Organization',
                message: `You have been invited to join ${organizationName}. Check your email for login credentials.`,
                relatedId: organizationId,
                relatedType: 'organization',
                actionUrl: '/dashboard/org/settings',
            });

            // Notify other organization members
            await notifyOrganizationMembers({
                organizationId,
                type: 'MEMBER_ADDED',
                title: 'New Member Added',
                message: `${memberUser.name || memberUser.email} has been added to the organization.`,
                relatedId: memberUser.id,
                relatedType: 'user',
                actionUrl: '/dashboard/org/members',
                excludeUserId: memberUser.id,
            });

            return res.status(201).json({
                success: true,
                message: 'New member created and invited successfully. Credentials sent via email.',
                data: { member: memberUser },
            });
        }
    } catch (error) {
        console.error('Add member error:', error);

        // Handle specific Prisma errors
        if (error.code === 'P2002') {
            return res.status(400).json({
                success: false,
                message: 'A user with this email already exists.',
            });
        }

        res.status(500).json({
            success: false,
            message: 'An error occurred while adding member. Please try again.',
        });
    }
});

/**
 * Get organization members (ADMIN or MEMBER)
 */
router.get('/members', async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch user with organization
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { organization: true, adminOrganization: true },
        });

        if (!user || user.role !== 'ORGANIZATION') {
            return res.status(403).json({
                success: false,
                message: 'Only organization users can access this endpoint.',
            });
        }

        const organizationId = user.isMember ? user.organizationId : user.adminOrganization?.id;

        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'User is not associated with any organization.',
            });
        }

        // Fetch all members including admin
        // Build conditions for members query
        const memberConditions = [
            { organizationId: organizationId, isMember: true },
        ];

        // Always include admin (user with isMember: false and adminOrganization matching this organization)
        const adminUser = await prisma.user.findFirst({
            where: {
                adminOrganization: {
                    id: organizationId,
                },
            },
        });

        if (adminUser) {
            memberConditions.push({ id: adminUser.id });
        }

        const members = await prisma.user.findMany({
            where: {
                OR: memberConditions,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isMember: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        res.status(200).json({
            success: true,
            data: { members },
        });
    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching members.',
        });
    }
});

/**
 * Update organization (ADMIN only)
 */
router.put('/update', updateOrganization);

/**
 * Remove member from organization (ADMIN only)
 */
router.delete('/members/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: memberId } = req.params;

        // Fetch admin user with organization
        const adminUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { adminOrganization: true },
        });

        // Check if user is organization admin
        if (!adminUser || adminUser.role !== 'ORGANIZATION' || adminUser.isMember) {
            return res.status(403).json({
                success: false,
                message: 'Only organization admins can remove members.',
            });
        }

        if (!adminUser.adminOrganization) {
            return res.status(400).json({
                success: false,
                message: 'User does not have an organization.',
            });
        }

        const organizationId = adminUser.adminOrganization.id;

        // Prevent admin from removing themselves
        if (memberId === userId) {
            return res.status(400).json({
                success: false,
                message: 'Admin cannot remove themselves. Transfer ownership first.',
            });
        }

        // Fetch member to verify they belong to this organization
        const member = await prisma.user.findUnique({
            where: { id: memberId },
        });

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found.',
            });
        }

        if (member.organizationId !== organizationId) {
            return res.status(403).json({
                success: false,
                message: 'This member does not belong to your organization.',
            });
        }

        if (!member.isMember) {
            return res.status(400).json({
                success: false,
                message: 'Cannot remove organization admin.',
            });
        }

        // Remove member - convert back to USER
        await prisma.user.update({
            where: { id: memberId },
            data: {
                role: 'USER',
                isMember: false,
                organizationId: null,
            },
        });

        // Notify the removed member
        await createNotification({
            userId: memberId,
            type: 'MEMBER_REMOVED',
            title: 'Removed from Organization',
            message: `You have been removed from ${adminUser.adminOrganization.name}.`,
            relatedId: organizationId,
            relatedType: 'organization',
        });

        // Notify other organization members
        await notifyOrganizationMembers({
            organizationId,
            type: 'MEMBER_REMOVED',
            title: 'Member Removed',
            message: `${member.name || member.email} has been removed from the organization.`,
            relatedId: memberId,
            relatedType: 'user',
            actionUrl: '/dashboard/org/members',
            excludeUserId: memberId,
        });

        res.status(200).json({
            success: true,
            message: 'Member removed successfully.',
        });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while removing member.',
        });
    }
});

/**
 * Leave organization (MEMBER only)
 */
router.post('/leave', async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { organization: true },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.',
            });
        }

        // Check if user is a member (not admin)
        if (!user.isMember) {
            return res.status(400).json({
                success: false,
                message: 'Only members can leave an organization. Admins must transfer ownership first.',
            });
        }

        if (!user.organizationId) {
            return res.status(400).json({
                success: false,
                message: 'You are not part of any organization.',
            });
        }

        // Remove member - convert back to USER
        await prisma.user.update({
            where: { id: userId },
            data: {
                role: 'USER',
                isMember: false,
                organizationId: null,
            },
        });

        res.status(200).json({
            success: true,
            message: 'You have left the organization successfully.',
        });
    } catch (error) {
        console.error('Leave organization error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while leaving organization.',
        });
    }
});

/**
 * Create resource (ADMIN only)
 */
router.post('/resources', async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, capacity } = req.body;

        if (!name || !capacity) {
            return res.status(400).json({
                success: false,
                message: 'Name and capacity are required.',
            });
        }

        if (capacity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Capacity must be greater than 0.',
            });
        }

        // Fetch admin user with organization
        const adminUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { adminOrganization: true },
        });

        // Check if user is organization admin
        if (!adminUser || adminUser.role !== 'ORGANIZATION' || adminUser.isMember) {
            return res.status(403).json({
                success: false,
                message: 'Only organization admins can create resources.',
            });
        }

        if (!adminUser.adminOrganization) {
            return res.status(400).json({
                success: false,
                message: 'User does not have an organization.',
            });
        }

        const organizationId = adminUser.adminOrganization.id;

        // Create resource
        const resource = await prisma.resource.create({
            data: {
                name,
                capacity,
                organizationId,
            },
        });

        // Notify organization members about new resource
        await notifyOrganizationMembers({
            organizationId,
            type: 'RESOURCE_CREATED',
            title: 'New Resource Created',
            message: `A new resource "${name}" with capacity ${capacity} has been created.`,
            relatedId: resource.id,
            relatedType: 'resource',
            actionUrl: '/dashboard/org/resources',
            excludeUserId: userId,
        });

        res.status(201).json({
            success: true,
            message: 'Resource created successfully.',
            data: { resource },
        });
    } catch (error) {
        console.error('Create resource error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while creating resource.',
        });
    }
});

/**
 * Get organization resources (ADMIN or MEMBER)
 */
router.get('/resources', async (req, res) => {
    try {
        const userId = req.user.id;
        console.log("USERID", userId)

        // Fetch user with organization
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { organization: true, adminOrganization: true },
        });
        console.log("USER", user)

        if (!user || user.role !== 'ORGANIZATION') {
            return res.status(403).json({
                success: false,
                message: 'Only organization users can access this endpoint.',
            });
        }


        const organizationId = user.isMember ? user.organizationId : user.adminOrganization?.id;
        console.log("ORGID", organizationId)

        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'User is not associated with any organization.',
            });
        }

        const resources = await prisma.resource.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
        });
        console.log("RESOURCES", resources)

        res.status(200).json({
            success: true,
            data: { resources },
        });
    } catch (error) {
        console.error('Get resources error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching resources.',
        });
    }
});

/**
 * Delete resource (ADMIN only)
 */
router.delete('/resources/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Fetch admin user with organization
        const adminUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { adminOrganization: true },
        });

        // Check if user is organization admin
        if (!adminUser || adminUser.role !== 'ORGANIZATION' || adminUser.isMember) {
            return res.status(403).json({
                success: false,
                message: 'Only organization admins can delete resources.',
            });
        }

        if (!adminUser.adminOrganization) {
            return res.status(400).json({
                success: false,
                message: 'User does not have an organization.',
            });
        }

        const organizationId = adminUser.adminOrganization.id;

        // Verify resource belongs to organization
        const resource = await prisma.resource.findFirst({
            where: {
                id,
                organizationId,
            },
        });

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: 'Resource not found.',
            });
        }

        // Delete resource
        await prisma.resource.delete({
            where: { id },
        });

        // Notify organization members about resource deletion
        await notifyOrganizationMembers({
            organizationId,
            type: 'RESOURCE_DELETED',
            title: 'Resource Deleted',
            message: `The resource "${resource.name}" has been deleted.`,
            relatedId: resource.id,
            relatedType: 'resource',
            actionUrl: '/dashboard/org/resources',
            excludeUserId: userId,
        });

        res.status(200).json({
            success: true,
            message: 'Resource deleted successfully.',
        });
    } catch (error) {
        console.error('Delete resource error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while deleting resource.',
        });
    }
});

/**
 * Create appointment (ADMIN only)
 */
router.post('/appointments', createAppointment);

/**
 * Get organization appointments (ADMIN or MEMBER)
 */
router.get('/appointments', getOrganizationAppointments);

/**
 * Get single appointment (ADMIN or MEMBER)
 */
router.get('/appointments/:id', getSingleAppointment);

module.exports = router;
