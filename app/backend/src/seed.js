import dotenv from 'dotenv';
dotenv.config();

import { sequelize, User } from './models/index.js';
import bcrypt from 'bcryptjs';

async function runSeed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('Sequelize synced');

    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@booksy.local';
    const adminPassword = process.env.SEED_ADMIN_PASS || 'Admin@123';

    let admin = await User.findOne({ where: { email: adminEmail } });
    if (!admin) {
      const hash = await bcrypt.hash(adminPassword, 10);
      admin = await User.create({ name: 'Admin', email: adminEmail, password: hash, role: 'admin', isEmailVerified: true });
      console.log('Created admin user:', adminEmail);
    } else {
      console.log('Admin user already exists:', adminEmail);
    }

    console.log('Seed finished');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message || err);
    process.exit(1);
  }
}

runSeed();
