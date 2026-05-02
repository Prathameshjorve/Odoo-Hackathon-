import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/booksy',
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  otpExpire: process.env.OTP_EXPIRE || '10m',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
