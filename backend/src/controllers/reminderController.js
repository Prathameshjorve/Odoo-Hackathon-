const prisma = require('../lib/prisma');
const axios = require('axios');
const { sendEmail } = require('../lib/mailer');

// WhatsApp API configuration
const WHATSAPP_API_URL = 'https://wachat.aryanshinde.in/api/wc/messages/template';
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || 'wc_live_e34b933d161fec7c64654d6e2383f5f7c31108968dc97393878af967e3ab677c';

/**
 * Get all bookings that are scheduled to start in the next 6 hours
 * This endpoint is designed for n8n scheduler to send WhatsApp reminders
 */
async function getUpcomingBookings(req, res) {
    try {
        const now = new Date();
        const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000);

        // Get all confirmed bookings starting in the next 6 hours
        const bookings = await prisma.booking.findMany({
            where: {
                bookingStatus: 'CONFIRMED',
                startTime: {
                    gte: now,
                    lte: sixHoursLater,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                appointment: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        durationMinutes: true,
                    },
                },
                assignedUser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                resource: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                startTime: 'asc',
            },
        });

        // Group bookings by user
        const userBookingsMap = {};

        bookings.forEach((booking) => {
            const userId = booking.user.id;

            if (!userBookingsMap[userId]) {
                userBookingsMap[userId] = {
                    user: {
                        id: booking.user.id,
                        name: booking.user.name,
                        email: booking.user.email,
                        phone: booking.user.phone,
                    },
                    bookings: [],
                };
            }

            userBookingsMap[userId].bookings.push({
                id: booking.id,
                appointmentTitle: booking.appointment.title,
                startTime: booking.startTime,
                endTime: booking.endTime,
                duration: booking.appointment.durationMinutes,
                assignedTo: booking.assignedUser?.name || booking.resource?.name || 'N/A',
            });
        });

        // Convert to array and format for WhatsApp
        const usersWithBookings = Object.values(userBookingsMap).map((userData) => {
            // Format appointments for WhatsApp message
            const appointmentsList = userData.bookings
                .map((booking, index) => {
                    const startTime = new Date(booking.startTime);
                    const endTime = new Date(booking.endTime);
                    const timeRange = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}-${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
                    
                    return `Appointment ${index + 1} - ${booking.appointmentTitle} [${timeRange}]`;
                })
                .join(', ');

            return {
                userId: userData.user.id,
                name: userData.user.name,
                email: userData.user.email,
                phone: userData.user.phone,
                bookingsCount: userData.bookings.length,
                appointments: userData.bookings,
                // Formatted message for WhatsApp template
                whatsappMessage: appointmentsList,
            };
        });

        res.json({
            success: true,
            message: `Found ${usersWithBookings.length} users with upcoming bookings`,
            data: {
                totalUsers: usersWithBookings.length,
                totalBookings: bookings.length,
                timeWindow: {
                    from: now.toISOString(),
                    to: sixHoursLater.toISOString(),
                },
                users: usersWithBookings,
            },
        });
    } catch (error) {
        console.error('Error fetching upcoming bookings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch upcoming bookings',
        });
    }
}

/**
 * Get bookings for a specific time window (flexible)
 * Query params: hoursAhead (default: 6)
 */
async function getBookingsInTimeWindow(req, res) {
    try {
        const hoursAhead = parseInt(req.query.hoursAhead) || 6;
        
        const now = new Date();
        const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

        const bookings = await prisma.booking.findMany({
            where: {
                bookingStatus: 'CONFIRMED',
                startTime: {
                    gte: now,
                    lte: futureTime,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                appointment: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        durationMinutes: true,
                    },
                },
                assignedUser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                resource: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                startTime: 'asc',
            },
        });

        // Group by user
        const userBookingsMap = {};

        bookings.forEach((booking) => {
            const userId = booking.user.id;

            if (!userBookingsMap[userId]) {
                userBookingsMap[userId] = {
                    user: {
                        id: booking.user.id,
                        name: booking.user.name,
                        email: booking.user.email,
                        phone: booking.user.phone,
                    },
                    bookings: [],
                };
            }

            userBookingsMap[userId].bookings.push({
                id: booking.id,
                appointmentTitle: booking.appointment.title,
                startTime: booking.startTime,
                endTime: booking.endTime,
                duration: booking.appointment.durationMinutes,
                assignedTo: booking.assignedUser?.name || booking.resource?.name || 'N/A',
            });
        });

        const usersWithBookings = Object.values(userBookingsMap).map((userData) => {
            const appointmentsList = userData.bookings
                .map((booking, index) => {
                    const startTime = new Date(booking.startTime);
                    const endTime = new Date(booking.endTime);
                    const timeRange = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}-${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
                    
                    return `Appointment ${index + 1} - ${booking.appointmentTitle} [${timeRange}]`;
                })
                .join(', ');

            return {
                userId: userData.user.id,
                name: userData.user.name,
                email: userData.user.email,
                phone: userData.user.phone,
                bookingsCount: userData.bookings.length,
                appointments: userData.bookings,
                whatsappMessage: appointmentsList,
            };
        });

        res.json({
            success: true,
            message: `Found ${usersWithBookings.length} users with bookings in the next ${hoursAhead} hours`,
            data: {
                totalUsers: usersWithBookings.length,
                totalBookings: bookings.length,
                hoursAhead,
                timeWindow: {
                    from: now.toISOString(),
                    to: futureTime.toISOString(),
                },
                users: usersWithBookings,
            },
        });
    } catch (error) {
        console.error('Error fetching bookings in time window:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
        });
    }
}

/**
 * Send WhatsApp reminders to all users with upcoming bookings
 * This endpoint does everything: fetch bookings + send WhatsApp messages
 */
async function sendWhatsAppReminders(req, res) {
    try {
        const now = new Date();
        const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000);

        // Get all confirmed bookings starting in the next 6 hours
        const bookings = await prisma.booking.findMany({
            where: {
                bookingStatus: 'CONFIRMED',
                startTime: {
                    gte: now,
                    lte: sixHoursLater,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                appointment: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        durationMinutes: true,
                    },
                },
                assignedUser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                resource: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                startTime: 'asc',
            },
        });

        // Group bookings by user
        const userBookingsMap = {};

        bookings.forEach((booking) => {
            const userId = booking.user.id;

            if (!userBookingsMap[userId]) {
                userBookingsMap[userId] = {
                    user: {
                        id: booking.user.id,
                        name: booking.user.name,
                        email: booking.user.email,
                        phone: booking.user.phone,
                    },
                    bookings: [],
                };
            }

            userBookingsMap[userId].bookings.push({
                id: booking.id,
                appointmentTitle: booking.appointment.title,
                startTime: booking.startTime,
                endTime: booking.endTime,
                duration: booking.appointment.durationMinutes,
                assignedTo: booking.assignedUser?.name || booking.resource?.name || 'N/A',
            });
        });

        const usersWithBookings = Object.values(userBookingsMap);

        // Send WhatsApp messages to all users
        const results = [];
        const errors = [];

        for (const userData of usersWithBookings) {
            // Skip if no phone number and no email
            if (!userData.user.phone && !userData.user.email) {
                errors.push({
                    userId: userData.user.id,
                    name: userData.user.name,
                    error: 'No phone number or email',
                });
                continue;
            }

            // Ensure phone has country code (add 91 if missing)
            let phone = null;
            if (userData.user.phone) {
                phone = userData.user.phone.replace(/\D/g, ''); // Remove non-digits
                if (phone.length === 10) {
                    phone = '91' + phone; // Add India country code
                }
            }

            // Format appointments for WhatsApp message
            const appointmentsList = userData.bookings
                .map((booking, index) => {
                    const startTime = new Date(booking.startTime);
                    const endTime = new Date(booking.endTime);
                    const timeRange = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}-${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
                    
                    return `Appointment ${index + 1} - ${booking.appointmentTitle} [${timeRange}]`;
                })
                .join(', ');

            // Format appointments for email (HTML)
            const appointmentsHtml = userData.bookings
                .map((booking, index) => {
                    const startTime = new Date(booking.startTime);
                    const endTime = new Date(booking.endTime);
                    const dateStr = startTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    const timeRange = `${startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                    
                    return `
                        <div style="background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #3b82f6; border-radius: 4px;">
                            <h3 style="margin: 0 0 10px 0; color: #1e40af;">${index + 1}. ${booking.appointmentTitle}</h3>
                            <p style="margin: 5px 0; color: #666;"><strong>📅 Date:</strong> ${dateStr}</p>
                            <p style="margin: 5px 0; color: #666;"><strong>🕐 Time:</strong> ${timeRange}</p>
                            <p style="margin: 5px 0; color: #666;"><strong>⏱️ Duration:</strong> ${booking.duration} minutes</p>
                            <p style="margin: 5px 0; color: #666;"><strong>👤 With:</strong> ${booking.assignedTo}</p>
                        </div>
                    `;
                })
                .join('');

            const emailHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>⏰ Appointment Reminder</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${userData.user.name}!</h2>
                            <p>This is a friendly reminder about your upcoming appointment${userData.bookings.length > 1 ? 's' : ''} in the next 6 hours:</p>
                            ${appointmentsHtml}
                            <p style="margin-top: 30px; padding: 15px; background-color: #dbeafe; border-radius: 4px;">
                                <strong>💡 Tip:</strong> Please arrive a few minutes early to ensure a smooth check-in process.
                            </p>
                        </div>
                        <div class="footer">
                            <p>&copy; ${new Date().getFullYear()} Appointment System. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            let whatsappSent = false;
            let emailSent = false;
            let whatsappError = null;
            let emailError = null;

            // Try to send WhatsApp message
            if (phone) {
                try {
                    const response = await axios.post(
                        WHATSAPP_API_URL,
                        {
                            to: phone,
                            template: {
                                name: 'reminder_for_appointments',
                                language: 'en_US',
                                components: [
                                    {
                                        type: 'header',
                                        parameters: [
                                            {
                                                type: 'text',
                                                text: userData.user.name,
                                            },
                                        ],
                                    },
                                    {
                                        type: 'body',
                                        parameters: [
                                            {
                                                type: 'text',
                                                text: appointmentsList,
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    );
                    whatsappSent = true;
                } catch (error) {
                    console.error(`Error sending WhatsApp to ${userData.user.name}:`, error.message);
                    whatsappError = error.message;
                }
            }

            // Try to send Email
            if (userData.user.email) {
                try {
                    const emailResult = await sendEmail(
                        userData.user.email,
                        `⏰ Reminder: Your Upcoming Appointment${userData.bookings.length > 1 ? 's' : ''}`,
                        emailHtml
                    );
                    emailSent = emailResult;
                    if (!emailResult) {
                        emailError = 'Email sending failed (check SMTP configuration)';
                    }
                } catch (error) {
                    console.error(`Error sending email to ${userData.user.name}:`, error.message);
                    emailError = error.message;
                }
            }

            // Record result
            if (whatsappSent || emailSent) {
                results.push({
                    userId: userData.user.id,
                    name: userData.user.name,
                    phone: phone,
                    email: userData.user.email,
                    bookingsCount: userData.bookings.length,
                    whatsappSent,
                    emailSent,
                    status: 'sent',
                });
            } else {
                errors.push({
                    userId: userData.user.id,
                    name: userData.user.name,
                    phone: phone,
                    email: userData.user.email,
                    whatsappError,
                    emailError,
                });
            }
        }

        // Calculate statistics
        const whatsappSentCount = results.filter(r => r.whatsappSent).length;
        const emailSentCount = results.filter(r => r.emailSent).length;

        res.json({
            success: true,
            message: `Sent ${whatsappSentCount} WhatsApp and ${emailSentCount} email reminders, ${errors.length} failed`,
            data: {
                totalUsers: usersWithBookings.length,
                totalBookings: bookings.length,
                sent: results.length,
                failed: errors.length,
                whatsappSent: whatsappSentCount,
                emailSent: emailSentCount,
                timeWindow: {
                    from: now.toISOString(),
                    to: sixHoursLater.toISOString(),
                },
                results,
                errors,
            },
        });
    } catch (error) {
        console.error('Error sending WhatsApp reminders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send WhatsApp reminders',
            error: error.message,
        });
    }
}

module.exports = {
    getUpcomingBookings,
    getBookingsInTimeWindow,
    sendWhatsAppReminders,
};
