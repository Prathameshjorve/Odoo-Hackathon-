const prisma = require('../lib/prisma');

/**
 * Get all organizations (public endpoint)
 */
const getAllOrganizations = async (req, res) => {
    try {
        const { search } = req.query;

        const whereClause = search
            ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { location: { contains: search, mode: 'insensitive' } },
                ],
            }
            : {};

        const organizations = await prisma.organization.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                description: true,
                location: true,
                businessHours: true,
                createdAt: true,
                _count: {
                    select: {
                        appointments: {
                            where: {
                                isPublished: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Map to include published appointment count
        const organizationsWithCount = organizations.map(org => ({
            ...org,
            publishedAppointmentsCount: org._count.appointments,
            _count: undefined, // Remove _count from response
        }));

        res.status(200).json({
            success: true,
            data: {
                organizations: organizationsWithCount,
            },
        });
    } catch (error) {
        console.error('Get all organizations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch organizations.',
        });
    }
};

/**
 * Get single organization with published appointments (public endpoint)
 */
const getOrganizationById = async (req, res) => {
    try {
        const { id } = req.params;

        const organization = await prisma.organization.findUnique({
            where: { id },
            include: {
                appointments: {
                    where: {
                        isPublished: true,
                    },
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        durationMinutes: true,
                        bookType: true,
                        price: true,
                        isPaid: true,
                        allowMultipleSlots: true,
                        maxSlotsPerBooking: true,
                        isPublished: true,
                        bookingsCount: true,
                        introMessage: true,
                        createdAt: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
        });

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found.',
            });
        }

        res.status(200).json({
            success: true,
            data: {
                organization,
            },
        });
    } catch (error) {
        console.error('Get organization by id error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch organization.',
        });
    }
};

module.exports = {
    getAllOrganizations,
    getOrganizationById,
};
