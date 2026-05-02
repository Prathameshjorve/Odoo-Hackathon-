import mongoose from 'mongoose';
import { config } from './config.js';

export async function connectDB() {
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

export function disconnectDB() {
  return mongoose.disconnect();
}
