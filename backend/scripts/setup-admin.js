const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@bookfastx.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        emailVerified: true,
        role: 'ORGANIZATION', // Give it org access too
      },
      create: {
        email,
        password: hashedPassword,
        name: 'System Admin',
        role: 'ORGANIZATION',
        emailVerified: true,
      },
    });

    console.log('Admin user created/updated:', user.email);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
