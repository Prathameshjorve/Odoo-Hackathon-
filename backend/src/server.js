require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { initializeMailer } = require('./lib/mailer');
// const { initSocket } = require('./socket');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const sessionRoutes = require('./routes/session');
const mediaRoutes = require('./routes/media');
const organizationRoutes = require('./routes/organization');
const appointmentRoutes = require('./routes/appointment');
const bookingRoutes = require('./routes/booking');
const publicRoutes = require('./routes/public');
const notificationRoutes = require('./routes/notification');
const reminderRoutes = require('./routes/reminder');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;

// Create HTTP server for Socket.IO
const server = http.createServer(app);


// Security middleware
app.use(helmet());

// CORS configuration - Allow all origins
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
}));

// Body parsing middleware
// Attach rawBody for webhook signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.',
// });
// app.use(limiter);

// Stricter rate limiting for auth routes
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 20, // limit each IP to 20 requests per windowMs
//   message: 'Too many authentication attempts, please try again later.',
// });

// Initialize mailer
initializeMailer();

// Initialize Socket.IO
// initSocket(server);
// console.log('✅ Socket.IO initialized');

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Auth API is running',
    version: '1.0.0',
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/sessions', sessionRoutes);
app.use('/media', mediaRoutes);
app.use('/organization', organizationRoutes);
app.use('/public', publicRoutes); // Public organization discovery routes
app.use('/admin', adminRoutes); // Admin routes
app.use('/', appointmentRoutes); // Public routes
app.use('/', bookingRoutes); // Booking routes (public + protected)
app.use('/', paymentRoutes); // Payments and webhooks
app.use('/notifications', notificationRoutes);
app.use('/reminders', reminderRoutes); // Reminder routes for n8n scheduler

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO is ready for real-time connections`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📧 SMTP configured: ${process.env.SMTP_USER ? 'Yes' : 'No'}`);
});

module.exports = app;
