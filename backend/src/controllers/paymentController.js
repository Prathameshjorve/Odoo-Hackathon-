const prisma = require("../lib/prisma");
const {
    getValidAccessTokenForOrganization,
    createOrderForBooking,
    verifyWebhookSignature,
} = require("../lib/razorpay");

// POST /payments/create-order
// Body: { bookingId }
// Requires authenticated user who owns the booking
async function createOrder(req, res) {
    try {
        const userId = req.user.id;
        const { bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "bookingId is required",
            });
        }

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                appointment: true,
            },
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        if (booking.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: "You can only pay for your own bookings",
            });
        }

        const appointment = booking.appointment;

        if (!appointment.isPaid || !booking.totalAmount || booking.totalAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "This booking does not require payment",
            });
        }

        // Get OAuth-based Razorpay connection (required)
        let connection;
        try {
            connection = await getValidAccessTokenForOrganization(appointment.organizationId);
        } catch (err) {
            console.error("Organization Razorpay connection error:", err.message);
            return res.status(400).json({
                success: false,
                message: "This organization has not connected their Razorpay account. Please contact the organization.",
            });
        }

        // Create order using OAuth connection
        let order;
        try {
            order = await createOrderForBooking(connection, booking, appointment);
        } catch (err) {
            console.error(
                "Error creating Razorpay order:",
                err.response?.data || err.message || err
            );
            return res.status(502).json({
                success: false,
                message: "Failed to create payment order. Please try again later.",
            });
        }

        const merchantKeyId = connection.merchantKeyId || null;

        if (!merchantKeyId) {
            console.error("Missing merchantKeyId for organization:", appointment.organizationId);
            return res.status(400).json({
                success: false,
                message: "Payment configuration is incomplete. Please contact the organization.",
            });
        }

        return res.json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                bookingId: booking.id,
                merchantKeyId,
            },
        });
    } catch (error) {
        console.error("Create payment order error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create payment order",
        });
    }
}

// POST /webhooks/razorpay
// Razorpay will send events for connected merchants here
async function handleWebhook(req, res) {
    try {
        const signature = req.headers["x-razorpay-signature"];
        const rawBody = req.rawBody || JSON.stringify(req.body || {});

        if (!signature) {
            return res.status(400).json({ success: false, message: "Missing Razorpay signature" });
        }

        const isValid = verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
            return res.status(400).json({ success: false, message: "Invalid Razorpay signature" });
        }

        const payload = req.body;
        const eventType = payload.event;
        const accountId = payload.account_id; // Connected merchant identifier (may be undefined for direct key flow)

        if (accountId) {
            // Best-effort mapping for OAuth-based connected accounts; ignore failures for direct-key fallback
            const connection = await prisma.organizationRazorpayConnection.findFirst({
                where: { razorpayMerchantId: accountId },
            });

            if (!connection) {
                console.warn("No organization mapping for Razorpay account", accountId);
            }
        }

        // Extract booking id from payment notes
        const paymentEntity = payload.payload?.payment?.entity || payload.payload?.order?.entity;
        const notes = paymentEntity?.notes || {};
        const bookingId = notes.bookingId || notes.booking_id;

        if (!bookingId) {
            console.error("No bookingId in Razorpay webhook notes", payload);
            return res.status(400).json({ success: false, message: "Missing booking reference" });
        }

        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) {
            console.error("Booking not found for webhook", bookingId);
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        let paymentStatusUpdate = null;
        let bookingStatusUpdate = null;
        let notificationType = null;
        let notificationMessage = "";

        switch (eventType) {
            case "payment.captured": {
                if (booking.paymentStatus !== "PAID") {
                    paymentStatusUpdate = "PAID";
                }
                if (booking.bookingStatus === "PENDING") {
                    bookingStatusUpdate = "CONFIRMED";
                }
                notificationType = "PAYMENT_RECEIVED";
                notificationMessage = "Your payment has been received and booking is confirmed.";
                break;
            }
            case "payment.failed": {
                if (booking.paymentStatus !== "FAILED") {
                    paymentStatusUpdate = "FAILED";
                }
                if (booking.bookingStatus !== "CANCELLED") {
                    bookingStatusUpdate = "CANCELLED";
                }
                notificationType = "PAYMENT_FAILED";
                notificationMessage = "Your payment failed. Please try again.";
                break;
            }
            case "refund.processed": {
                if (booking.paymentStatus !== "REFUNDED") {
                    paymentStatusUpdate = "REFUNDED";
                }
                // Do not force bookingStatus; organization might decide via dashboard
                notificationType = "PAYMENT_RECEIVED";
                notificationMessage = "Your refund has been processed.";
                break;
            }
            default:
                // Ignore other events gracefully
                return res.json({ success: true, message: "Event ignored" });
        }

        if (paymentStatusUpdate || bookingStatusUpdate) {
            await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    ...(paymentStatusUpdate && { paymentStatus: paymentStatusUpdate }),
                    ...(bookingStatusUpdate && { bookingStatus: bookingStatusUpdate }),
                },
            });
        }

        if (notificationType) {
            try {
                // Notify the user who made the booking
                await prisma.notification.create({
                    data: {
                        userId: booking.userId,
                        type: notificationType,
                        title:
                            notificationType === "PAYMENT_RECEIVED"
                                ? "Payment Received"
                                : "Payment Failed",
                        message: notificationMessage,
                        relatedId: booking.id,
                        relatedType: "BOOKING",
                    },
                });

                // If payment was successful, notify organization admin about payment
                if (eventType === "payment.captured" && paymentStatusUpdate === "PAID") {
                    const bookingWithDetails = await prisma.booking.findUnique({
                        where: { id: bookingId },
                        include: {
                            appointment: {
                                include: {
                                    organization: {
                                        include: {
                                            admin: true,
                                        },
                                    },
                                },
                            },
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    });

                    if (bookingWithDetails && bookingWithDetails.appointment.organization.admin) {
                        const orgAdmin = bookingWithDetails.appointment.organization.admin;
                        const amount = bookingWithDetails.totalAmount || 0;

                        // Notify organization admin about payment received
                        await prisma.notification.create({
                            data: {
                                userId: orgAdmin.id,
                                type: "PAYMENT_RECEIVED",
                                title: "Payment Received",
                                message: `Payment of ₹${amount} received from ${bookingWithDetails.user.name} for "${bookingWithDetails.appointment.title}"`,
                                relatedId: booking.id,
                                relatedType: "BOOKING",
                                actionUrl: "/dashboard/org/appointments",
                            },
                        });

                        // Send WhatsApp notification to organization admin about payment
                        if (orgAdmin.phone) {
                            try {
                                const axios = require('axios');

                                const formattedDate = new Date(bookingWithDetails.startTime).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                });

                                const whatsappMessage = `Payment of ₹${amount} received from ${bookingWithDetails.user.name} for "${bookingWithDetails.appointment.title}" scheduled on ${formattedDate}.`;

                                // Remove any non-digit characters from phone number
                                const cleanPhone = orgAdmin.phone.replace(/\D/g, '');

                                const whatsappPayload = {
                                    to: cleanPhone,
                                    template: {
                                        name: "notification_reminder",
                                        language: "en_US",
                                        components: [
                                            {
                                                type: "header",
                                                parameters: [
                                                    {
                                                        type: "text",
                                                        text: orgAdmin.name || "Admin"
                                                    }
                                                ]
                                            },
                                            {
                                                type: "body",
                                                parameters: [
                                                    {
                                                        type: "text",
                                                        text: whatsappMessage
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                };

                                // Send WhatsApp notification (don't wait for response)
                                axios.post('https://wachat.aryanshinde.in/api/wc/messages/template', whatsappPayload, {
                                    headers: {
                                        'Authorization': 'Bearer wc_live_e34b933d161fec7c64654d6e2383f5f7c31108968dc97393878af967e3ab677c',
                                        'Content-Type': 'application/json',
                                    },
                                }).then(() => {
                                    console.log('WhatsApp payment notification sent successfully to:', cleanPhone);
                                }).catch((error) => {
                                    console.error('Error sending WhatsApp payment notification:', error.response?.data || error.message);
                                });
                            } catch (error) {
                                console.error('Error preparing WhatsApp payment notification:', error);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to create payment notification:", err);
            }
        }

        return res.json({ success: true });
    } catch (error) {
        console.error("Razorpay webhook error:", error);
        return res.status(500).json({ success: false, message: "Webhook processing failed" });
    }
}

module.exports = {
    createOrder,
    handleWebhook,
};
