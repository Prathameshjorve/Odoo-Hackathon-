require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { initializeMailer } = require('./lib/mailer');
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
const serverless = require('serverless-http');

const app = express();

// security
app.use(helmet());

// CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// body parsing
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// cookies
app.use(cookieParser());

// mailer
initializeMailer();

// health
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

// routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/sessions', sessionRoutes);
app.use('/media', mediaRoutes);
app.use('/organization', organizationRoutes);
app.use('/public', publicRoutes);
app.use('/admin', adminRoutes);
app.use('/', appointmentRoutes);
app.use('/', bookingRoutes);
app.use('/', paymentRoutes);
app.use('/notifications', notificationRoutes);
app.use('/reminders', reminderRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// wrap in serverless handler
const handler = serverless(app);

module.exports = (req, res) => {
  return handler(req, res);
};
