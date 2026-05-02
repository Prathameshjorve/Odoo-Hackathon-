const prisma = require('../lib/prisma');
const crypto = require('crypto');
const { notifyOrganizationMembers } = require('../lib/notificationHelper');
const {
    // emitAppointmentCreated,
    // emitAppointmentUpdated,
    // emitAppointmentPublished,
    // emitAppointmentUnpublished,
} = require('../socket');

// Generate secret link for unpublished appointments
const generateSecretLink = () => {
    return crypto.randomBytes(16).toString('hex');
};

/**
 * Create appointment (ORGANIZATION admin only)
 */
async function createAppointment(req, res) {
    try {
        const userId = req.user.id;
        const {
            title,
            description,
            durationMinutes,
            bookType,
            assignmentType,
            allowMultipleSlots,
            isPaid,
            price,
            cancellationHours,
            schedule,
            questions,
            allowedUserIds,
            allowedResourceIds,
            location,
        } = req.body;

        // Fetch user with organization
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { adminOrganization: true },
        });

        // Check if user is organization admin
        if (!user || user.role !== 'ORGANIZATION' || user.isMember) {
            return res.status(403).json({
                success: false,
                message: 'Only organization admins can create appointments.',
            });
        }

        if (!user.adminOrganization) {
            return res.status(400).json({
                success: false,
                message: 'User does not have an organization.',
            });
        }

        const organizationId = user.adminOrganization.id;

        // Validations
        if (!title || !durationMinutes || !bookType || !assignmentType || !schedule || !questions) {
            return res.status(400).json({
                success: false,
                message: 'Title, durationMinutes, bookType, assignmentType, schedule, and questions are required.',
            });
        }

        if (durationMinutes <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Duration minutes must be greater than 0.',
            });
        }

        if (!['USER', 'RESOURCE'].includes(bookType)) {
            return res.status(400).json({
                success: false,
                message: 'Book type must be either USER or RESOURCE.',
            });
        }

        if (!['AUTOMATIC', 'BY_VISITOR'].includes(assignmentType)) {
            return res.status(400).json({
                success: false,
                message: 'Assignment type must be either AUTOMATIC or BY_VISITOR.',
            });
        }

        // If marked as paid, ensure a valid price is provided
        if (isPaid) {
            if (price === undefined || price === null || Number.isNaN(Number(price)) || Number(price) <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid price is required for paid appointments.',
                });
            }
        }

        // Validate schedule structure
        if (!Array.isArray(schedule) || schedule.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Schedule must be a non-empty array.',
            });
        }

        // Get organization business hours
        const organization = await prisma.organization.findUnique({
            where: { id: organizationId },
        });

        // Validate schedule against business hours
        for (const slot of schedule) {
            if (!slot.day || !slot.from || !slot.to) {
                return res.status(400).json({
                    success: false,
                    message: 'Each schedule slot must have day, from, and to fields.',
                });
            }

            // Check start < end
            if (slot.from >= slot.to) {
                return res.status(400).json({
                    success: false,
                    message: `Schedule slot for ${slot.day}: start time must be before end time.`,
                });
            }

            // Check against business hours
            const businessHour = organization.businessHours.find((bh) => bh.day === slot.day);
            if (!businessHour) {
                return res.status(400).json({
                    success: false,
                    message: `No business hours defined for ${slot.day}.`,
                });
            }

            if (slot.from < businessHour.from || slot.to > businessHour.to) {
                return res.status(400).json({
                    success: false,
                    message: `Schedule for ${slot.day} must be within business hours (${businessHour.from} - ${businessHour.to}).`,
                });
            }
        }

        // Validate allowed users/resources based on bookType
        if (bookType === 'USER') {
            if (!allowedUserIds || !Array.isArray(allowedUserIds) || allowedUserIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Allowed users are required for USER book type.',
                });
            }

            // Verify all users are organization members
            const users = await prisma.user.findMany({
                where: {
                    id: { in: allowedUserIds },
                    role: 'ORGANIZATION',
                    organizationId: organizationId,
                },
            });

            if (users.length !== allowedUserIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'All allowed users must be members of your organization.',
                });
            }
        }

        if (bookType === 'RESOURCE') {
            if (!allowedResourceIds || !Array.isArray(allowedResourceIds) || allowedResourceIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Allowed resources are required for RESOURCE book type.',
                });
            }

            // Verify all resources belong to organization
            const resources = await prisma.resource.findMany({
                where: {
                    id: { in: allowedResourceIds },
                    organizationId: organizationId,
                },
            });

            if (resources.length !== allowedResourceIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'All allowed resources must belong to your organization.',
                });
            }
        }

        // Create appointment
        const appointment = await prisma.appointment.create({
            data: {
                title,
                description,
                durationMinutes,
                bookType,
                assignmentType,
                allowMultipleSlots: allowMultipleSlots || false,
                isPaid: !!isPaid,
                price: price !== undefined && price !== null ? Number(price) : null,
                cancellationHours: cancellationHours || 0,
                schedule,
                questions,
                introMessage: req.body.introMessage || null,
                confirmationMessage: req.body.confirmationMessage || null,
                location: location || null,
                organizationId,
                allowedUsers: bookType === 'USER' ? { connect: allowedUserIds.map((id) => ({ id })) } : undefined,
                allowedResources:
                    bookType === 'RESOURCE' ? { connect: allowedResourceIds.map((id) => ({ id })) } : undefined,
            },
            include: {
                allowedUsers: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                allowedResources: {
                    select: {
                        id: true,
                        name: true,
                        capacity: true,
                    },
                },
            },
        });

        // Notify organization members about new appointment
        await notifyOrganizationMembers({
            organizationId,
            type: 'APPOINTMENT_CREATED',
            title: 'New Appointment Created',
            message: `${user.name} created a new appointment: "${title}"`,
            relatedId: appointment.id,
            relatedType: 'appointment',
            actionUrl: `/dashboard/org/appointments`,
        });

        // Emit socket event for real-time update
        // emitAppointmentCreated(organizationId, appointment);

        res.status(201).json({
            success: true,
            message: 'Appointment created successfully.',
            data: { appointment },
        });
    } catch (error) {
        console.error('Create appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while creating appointment.',
        });
    }
}

/**
 * Get organization appointments (ORGANIZATION admin/member only)
 */
async function getOrganizationAppointments(req, res) {
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

        const appointments = await prisma.appointment.findMany({
            where: { organizationId },
            include: {
                allowedUsers: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                allowedResources: {
                    select: {
                        id: true,
                        name: true,
                        capacity: true,
                    },
                },
                _count: {
                    select: {
                        bookings: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Map appointments to include bookingsCount
        const appointmentsWithCount = appointments.map(apt => ({
            ...apt,
            bookingsCount: apt._count.bookings,
            _count: undefined,
        }));

        res.status(200).json({
            success: true,
            data: { appointments: appointmentsWithCount },
        });
    } catch (error) {
        console.error('Get organization appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching appointments.',
        });
    }
}

/**
 * Get single appointment (ORGANIZATION admin/member only)
 */
async function getSingleAppointment(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

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

        const appointment = await prisma.appointment.findFirst({
            where: {
                id,
                organizationId,
            },
            include: {
                allowedUsers: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                allowedResources: {
                    select: {
                        id: true,
                        name: true,
                        capacity: true,
                    },
                },
            },
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found.',
            });
        }

        res.status(200).json({
            success: true,
            data: { appointment },
        });
    } catch (error) {
        console.error('Get single appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching appointment.',
        });
    }
}

/**
 * Get public appointments for an organization (NO AUTH)
 */
async function getPublicAppointments(req, res) {
    try {
        const { organizationId } = req.params;

        // Verify organization exists
        const organization = await prisma.organization.findUnique({
            where: { id: organizationId },
        });

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found.',
            });
        }

        // Return sanitized appointment data
        const appointments = await prisma.appointment.findMany({
            where: { organizationId },
            select: {
                id: true,
                title: true,
                description: true,
                durationMinutes: true,
                bookType: true,
                assignmentType: true,
                allowMultipleSlots: true,
                isPaid: true,
                price: true,
                cancellationHours: true,
                schedule: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({
            success: true,
            data: {
                organization: {
                    id: organization.id,
                    name: organization.name,
                    location: organization.location,
                    description: organization.description,
                },
                appointments,
            },
        });
    } catch (error) {
        console.error('Get public appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching appointments.',
        });
    }
}

/**
 * Publish appointment (ORGANIZATION admin only)
 */
async function publishAppointment(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { adminOrganization: true },
        });

        if (!user || user.role !== 'ORGANIZATION' || user.isMember) {
            return res.status(403).json({
                success: false,
                message: 'Only organization admins can publish appointments.',
            });
        }

        const appointment = await prisma.appointment.findFirst({
            where: {
                id,
                organizationId: user.adminOrganization.id,
            },
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found.',
            });
        }

        await prisma.appointment.update({
            where: { id },
            data: {
                isPublished: true,
                secretLink: null,
                expiryTime: null,
                expiryCapacity: null,
            },
        });

        // Notify organization members about appointment being published
        await notifyOrganizationMembers({
            organizationId: user.adminOrganization.id,
            type: 'APPOINTMENT_PUBLISHED',
            title: 'Appointment Published',
            message: `${user.name} published the appointment: "${appointment.title}"`,
            relatedId: appointment.id,
            relatedType: 'appointment',
            actionUrl: `/dashboard/org/appointments`,
        });

        // Fetch full appointment data for socket emit
        const publishedAppointment = await prisma.appointment.findUnique({
            where: { id },
            include: {
                allowedUsers: {
                    select: { id: true, name: true, email: true },
                },
                allowedResources: {
                    select: { id: true, name: true, capacity: true },
                },
            },
        });

        // Emit socket event for real-time update
        // emitAppointmentPublished(user.adminOrganization.id, publishedAppointment);

        res.json({
            success: true,
            message: 'Appointment published successfully.',
        });
    } catch (error) {
        console.error('Publish appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while publishing appointment.',
        });
    }
}

/**
 * Unpublish appointment (ORGANIZATION admin only)
 */
async function unpublishAppointment(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { adminOrganization: true },
        });

        if (!user || user.role !== 'ORGANIZATION' || user.isMember) {
            return res.status(403).json({
                success: false,
                message: 'Only organization admins can unpublish appointments.',
            });
        }

        const appointment = await prisma.appointment.findFirst({
            where: {
                id,
                organizationId: user.adminOrganization.id,
            },
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found.',
            });
        }

        await prisma.appointment.update({
            where: { id },
            data: {
                isPublished: false,
            },
        });

        // Emit socket event for real-time update
        // emitAppointmentUnpublished(user.adminOrganization.id, appointment.id);

        res.json({
            success: true,
            message: 'Appointment unpublished successfully.',
        });
    } catch (error) {
        console.error('Unpublish appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while unpublishing appointment.',
        });
    }
}

/**
 * Generate secret link for unpublished appointment (ORGANIZATION admin only)
 */
async function generateSecretLinkForAppointment(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { expiryTime, expiryCapacity } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { adminOrganization: true },
        });

        if (!user || user.role !== 'ORGANIZATION' || user.isMember) {
            return res.status(403).json({
                success: false,
                message: 'Only organization admins can generate secret links.',
            });
        }

        const appointment = await prisma.appointment.findFirst({
            where: {
                id,
                organizationId: user.adminOrganization.id,
            },
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found.',
            });
        }

        if (appointment.isPublished) {
            return res.status(400).json({
                success: false,
                message: 'Cannot generate secret link for published appointments.',
            });
        }

        const secretLink = generateSecretLink();

        await prisma.appointment.update({
            where: { id },
            data: {
                secretLink,
                expiryTime: expiryTime ? new Date(expiryTime) : null,
                expiryCapacity: expiryCapacity || null,
                bookingsCount: 0,
            },
        });

        res.json({
            success: true,
            message: 'Secret link generated successfully.',
            data: {
                secretLink,
                fullLink: `${process.env.BASE_URL || 'http://localhost:3000'}/appointments/${id}?secret=${secretLink}`,
            },
        });
    } catch (error) {
        console.error('Generate secret link error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while generating secret link.',
        });
    }
}

/**
 * Update appointment (ORGANIZATION admin only)
 */
async function updateAppointment(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const {
            title,
            description,
            durationMinutes,
            isPaid,
            price,
            cancellationHours,
            schedule,
            questions,
            introMessage,
            confirmationMessage,
            allowedUserIds,
            allowedResourceIds,
            location,
            assignmentType } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { adminOrganization: true },
        });

        if (!user || user.role !== 'ORGANIZATION' || user.isMember) {
            return res.status(403).json({
                success: false,
                message: 'Only organization admins can update appointments.',
            });
        }

        const appointment = await prisma.appointment.findFirst({
            where: {
                id,
                organizationId: user.adminOrganization.id,
            },
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found.',
            });
        }

        const updateData = {};
        if (title) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (durationMinutes) updateData.durationMinutes = durationMinutes;
        if (typeof isPaid === 'boolean') updateData.isPaid = isPaid;
        if (price !== undefined) updateData.price = price !== null ? Number(price) : null;
        if (cancellationHours !== undefined) updateData.cancellationHours = cancellationHours;
        if (schedule) updateData.schedule = schedule;
        if (questions) updateData.questions = questions;
        if (introMessage !== undefined) updateData.introMessage = introMessage;
        if (confirmationMessage !== undefined) updateData.confirmationMessage = confirmationMessage;
        if (location !== undefined) updateData.location = location;
        if (assignmentType) updateData.assignmentType = assignmentType;

        // Handle user/resource updates
        if (allowedUserIds && appointment.bookType === 'USER') {
            updateData.allowedUsers = {
                set: allowedUserIds.map((uid) => ({ id: uid })),
            };
        }
        if (allowedResourceIds && appointment.bookType === 'RESOURCE') {
            updateData.allowedResources = {
                set: allowedResourceIds.map((rid) => ({ id: rid })),
            };
        }

        const updatedAppointment = await prisma.appointment.update({
            where: { id },
            data: updateData,
            include: {
                allowedUsers: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                allowedResources: {
                    select: {
                        id: true,
                        name: true,
                        capacity: true,
                    },
                },
            },
        });

        // Notify organization members about appointment update
        await notifyOrganizationMembers({
            organizationId: user.adminOrganization.id,
            type: 'APPOINTMENT_UPDATED',
            title: 'Appointment Updated',
            message: `${user.name} updated the appointment: "${updatedAppointment.title}"`,
            relatedId: updatedAppointment.id,
            relatedType: 'appointment',
            actionUrl: `/dashboard/org/appointments`,
        });

        // Emit socket event for real-time update
        // emitAppointmentUpdated(user.adminOrganization.id, updatedAppointment);

        res.json({
            success: true,
            message: 'Appointment updated successfully.',
            data: { appointment: updatedAppointment },
        });
    } catch (error) {
        console.error('Update appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating appointment.',
        });
    }
}

module.exports = {
    createAppointment,
    getOrganizationAppointments,
    getSingleAppointment,
    getPublicAppointments,
    publishAppointment,
    unpublishAppointment,
    generateSecretLinkForAppointment,
    updateAppointment,
};
