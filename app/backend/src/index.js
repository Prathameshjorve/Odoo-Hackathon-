import express from 'express';
import cors from 'cors';
import { config } from './config/config.js';
import { connectDB } from './config/database.js';
import { sequelize } from './models/index.js';
import { errorHandler, notFound } from './middleware/error.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Connect to database and start server
async function startServer() {
  try {
    await connectDB();
    // Initialize Sequelize (MySQL) and sync models
    try {
      await sequelize.authenticate();
      await sequelize.sync();
      console.log('Sequelize connected and models synced');
    } catch (err) {
      console.error('Sequelize connection/sync error:', err.message || err);
    }
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
