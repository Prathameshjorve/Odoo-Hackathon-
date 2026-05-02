/**
 * Emit appointment deleted event
 * Sent to: organization room + public room
 */
// function emitAppointmentDeleted(organizationId, appointmentId) {
//     if (!io) {
//         console.error('❌ Socket.IO not initialized');
//         return;
//     }
//     io.to(`org:${organizationId}`).emit('appointment:deleted', { id: appointmentId });
//     io.to('public').emit('appointment:deleted', { id: appointmentId });
//     console.log(`Emitted appointment:deleted for org ${organizationId}`);
// }
// const { Server } = require('socket.io');

// let io;

/**
 * Initialize Socket.IO server
 */
// function initSocket(server) {
//     io = new Server(server, {
//         cors: {
//             origin: true, // Allow all origins (same as Express CORS config)
//             credentials: true,
//             methods: ["GET", "POST"],
//         },
//         transports: ['websocket', 'polling'], // Support both transports
//     });

//     io.on('connection', (socket) => {
//         console.log(`✅ Socket connected: ${socket.id}`);

//         // Join organization room for organization-specific updates
//         socket.on('join:organization', (organizationId) => {
//             if (organizationId) {
//                 socket.join(`org:${organizationId}`);
//                 console.log(`👥 Socket ${socket.id} joined organization room: org:${organizationId}`);

//                 // Log current rooms
//                 console.log(`📍 Socket ${socket.id} is in rooms:`, Array.from(socket.rooms));
//             }
//         });

//         // Join appointment room for appointment-specific updates
//         socket.on('join:appointment', (appointmentId) => {
//             if (appointmentId) {
//                 socket.join(`appointment:${appointmentId}`);
//                 console.log(`📅 Socket ${socket.id} joined appointment room: appointment:${appointmentId}`);

//                 // Log current rooms
//                 console.log(`📍 Socket ${socket.id} is in rooms:`, Array.from(socket.rooms));
//             }
//         });

//         // Join global room for public updates (search page)
//         socket.on('join:public', () => {
//             socket.join('public');
//             console.log(`🌐 Socket ${socket.id} joined public room`);

//             // Log current rooms
//             console.log(`📍 Socket ${socket.id} is in rooms:`, Array.from(socket.rooms));
//         });

//         // Leave organization room
//         socket.on('leave:organization', (organizationId) => {
//             if (organizationId) {
//                 socket.leave(`org:${organizationId}`);
//                 console.log(`Socket ${socket.id} left organization ${organizationId}`);
//             }
//         });

//         // Leave appointment room
//         socket.on('leave:appointment', (appointmentId) => {
//             if (appointmentId) {
//                 socket.leave(`appointment:${appointmentId}`);
//                 console.log(`Socket ${socket.id} left appointment ${appointmentId}`);
//             }
//         });

//         socket.on('disconnect', () => {
//             console.log(`Socket disconnected: ${socket.id}`);
//         });
//     });

//     return io;
// }

/**
 * Emit appointment created event
 * Sent to: organization room + public room
 */
// function emitAppointmentCreated(organizationId, appointment) {
//     if (!io) {
//         console.error('❌ Socket.IO not initialized');
//         return;
//     }

//     console.log(`🔔 Emitting appointment:created to org:${organizationId} and public`);
//     console.log(`📋 Appointment: ${appointment.title} (${appointment.id})`);

//     // Emit to organization members
//     io.to(`org:${organizationId}`).emit('appointment:created', appointment);

//     // Emit to public room if published
//     if (appointment.isPublished) {
//         io.to('public').emit('appointment:created', appointment);
//     }

//     console.log(`✅ Emitted appointment:created for org ${organizationId}`);
// }

/**
 * Emit appointment updated event
 * Sent to: organization room + public room + appointment room
 */
// function emitAppointmentUpdated(organizationId, appointment) {
//     if (!io) {
//         console.error('❌ Socket.IO not initialized');
//         return;
//     }

//     console.log(`🔔 Emitting appointment:updated to org:${organizationId}, public, and appointment:${appointment.id}`);
//     console.log(`📋 Appointment: ${appointment.title} (${appointment.id}), isPublished: ${appointment.isPublished}`);

//     // Emit to organization members
//     io.to(`org:${organizationId}`).emit('appointment:updated', appointment);

//     // Emit to public room if published
//     if (appointment.isPublished) {
//         io.to('public').emit('appointment:updated', appointment);
//     }

//     // Emit to anyone viewing this specific appointment
//     io.to(`appointment:${appointment.id}`).emit('appointment:updated', appointment);

//     console.log(`✅ Emitted appointment:updated for org ${organizationId}`);
// }

/**
 * Emit appointment deleted event
 * Sent to: organization room + public room
 */

/**
 * Emit appointment published event
 * Sent to: organization room + public room
 */
// function emitAppointmentPublished(organizationId, appointment) {
//     if (!io) {
//         console.error('❌ Socket.IO not initialized');
//         return;
//     }
//     console.log(`🔔 Emitting appointment:published to org:${organizationId} and public`);
//     console.log(`📋 Appointment: ${appointment.title} (${appointment.id})`);
//     io.to(`org:${organizationId}`).emit('appointment:published', appointment);
//     io.to('public').emit('appointment:published', appointment);
//     console.log(`✅ Emitted appointment:published for org ${organizationId}`);
// }

/**
 * Emit appointment unpublished event
 * Sent to: organization room + public room
 */
// function emitAppointmentUnpublished(organizationId, appointmentId) {
//     if (!io) {
//         console.error('❌ Socket.IO not initialized');
//         return;
//     }
//     console.log(`🔔 Emitting appointment:unpublished to org:${organizationId} and public`);
//     console.log(`📋 Appointment ID: ${appointmentId}`);
//     io.to(`org:${organizationId}`).emit('appointment:unpublished', { id: appointmentId });
//     io.to('public').emit('appointment:unpublished', { id: appointmentId });
//     console.log(`✅ Emitted appointment:unpublished for org ${organizationId}`);
// }

/**
 * Emit organization created event
 * Sent to: public room
 */
// function emitOrganizationCreated(organization) {
//     if (!io) return;

//     io.to('public').emit('organization:created', organization);

//     console.log(`Emitted organization:created for org ${organization.id}`);
// }

/**
 * Emit organization updated event
 * Sent to: organization room + public room
 */
// function emitOrganizationUpdated(organizationId, organization) {
//     if (!io) return;

//     io.to(`org:${organizationId}`).emit('organization:updated', organization);
//     io.to('public').emit('organization:updated', organization);

//     console.log(`Emitted organization:updated for org ${organizationId}`);
// }

/**
 * Emit booking created event
 * Sent to: organization room + appointment room
 * This triggers time slot recalculation
 */
// function emitBookingCreated(organizationId, appointmentId, booking) {
//     if (!io) return;

//     // Emit to organization members
//     io.to(`org:${organizationId}`).emit('booking:created', booking);

//     // Emit to anyone viewing this appointment (triggers slot refresh)
//     io.to(`appointment:${appointmentId}`).emit('booking:created', {
//         ...booking,
//         // Signal to refresh available slots
//         _refreshSlots: true,
//     });

//     console.log(`Emitted booking:created for appointment ${appointmentId}`);
// }

/**
 * Emit booking cancelled event
 * Sent to: organization room + appointment room
 * This triggers time slot recalculation
 */
// function emitBookingCancelled(organizationId, appointmentId, bookingId) {
//     if (!io) return;

//     // Emit to organization members
//     io.to(`org:${organizationId}`).emit('booking:cancelled', { id: bookingId });

//     // Emit to anyone viewing this appointment (triggers slot refresh)
//     io.to(`appointment:${appointmentId}`).emit('booking:cancelled', {
//         id: bookingId,
//         // Signal to refresh available slots
//         _refreshSlots: true,
//     });

//     console.log(`Emitted booking:cancelled for appointment ${appointmentId}`);
// }

/**
 * Emit booking updated event
 * Sent to: organization room + appointment room
 */
// function emitBookingUpdated(organizationId, appointmentId, booking) {
//     if (!io) return;

//     io.to(`org:${organizationId}`).emit('booking:updated', booking);
//     io.to(`appointment:${appointmentId}`).emit('booking:updated', booking);

//     console.log(`Emitted booking:updated for appointment ${appointmentId}`);
// }

// module.exports = {
//     // initSocket,
//     emitAppointmentCreated,
//     emitAppointmentUpdated,
//     emitAppointmentDeleted,
//     emitAppointmentPublished,
//     emitAppointmentUnpublished,
//     emitOrganizationCreated,
//     emitOrganizationUpdated,
//     emitAppointmentDeleted,
//     emitBookingCreated,
//     emitBookingCancelled,
//     emitBookingUpdated,
// };
