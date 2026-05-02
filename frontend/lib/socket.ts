import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Create socket instance
export const socket: Socket = io(SOCKET_URL, {
    autoConnect: false, // Don't connect automatically
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
    withCredentials: true, // Send cookies with requests
    path: '/socket.io/', // Default socket.io path
});

// Connection event handlers
socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
});

socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
    console.log('Attempting to reconnect...');
});

socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
});

// Helper functions for joining/leaving rooms
export const socketHelpers = {
    /**
     * Join organization room for organization-specific updates
     */
    joinOrganization: (organizationId: string) => {
        if (socket.connected && organizationId) {
            socket.emit('join:organization', organizationId);
            console.log(`👥 Joining organization room: org:${organizationId}`);
        } else if (!socket.connected) {
            console.warn('⚠️ Cannot join organization room - socket not connected');
        }
    },

    /**
     * Leave organization room
     */
    leaveOrganization: (organizationId: string) => {
        if (socket.connected && organizationId) {
            socket.emit('leave:organization', organizationId);
            console.log(`👋 Left organization room: org:${organizationId}`);
        }
    },

    /**
     * Join appointment room for appointment-specific updates
     */
    joinAppointment: (appointmentId: string) => {
        if (socket.connected && appointmentId) {
            socket.emit('join:appointment', appointmentId);
            console.log(`📅 Joining appointment room: appointment:${appointmentId}`);
        } else if (!socket.connected) {
            console.warn('⚠️ Cannot join appointment room - socket not connected');
        }
    },

    /**
     * Leave appointment room
     */
    leaveAppointment: (appointmentId: string) => {
        if (socket.connected && appointmentId) {
            socket.emit('leave:appointment', appointmentId);
            console.log(`👋 Left appointment room: appointment:${appointmentId}`);
        }
    },

    /**
     * Join public room for global updates (search page)
     */
    joinPublic: () => {
        if (socket.connected) {
            socket.emit('join:public');
            console.log('🌐 Joining public room');
        } else {
            console.warn('⚠️ Cannot join public room - socket not connected');
        }
    },

    /**
     * Connect socket if not already connected
     */
    connect: () => {
        if (!socket.connected) {
            socket.connect();
        }
    },

    /**
     * Disconnect socket
     */
    disconnect: () => {
        if (socket.connected) {
            socket.disconnect();
        }
    },
};

// Export socket instance as default
export default socket;
