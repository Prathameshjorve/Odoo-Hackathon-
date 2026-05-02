import mongoose from 'mongoose';
import { config } from './config.js';
import sequelize from '../sequelize.js';

export async function connectDB() {
  // Try Sequelize first (supports SQLite by default for local testing)
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('Sequelize connected and models synced');
    return;
  } catch (err) {
    console.warn('Sequelize connection/sync failed — falling back to MongoDB:', err.message || err);
  }

  try {
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
}

export async function disconnectDB() {
  try {
    await sequelize.close();
  } catch (_) {}
  try {
    await mongoose.disconnect();
  } catch (_) {}
}
