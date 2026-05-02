const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyUser() {
  const email = 'aniketradhe333@gmail.com';
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerified: true },
    });
    console.log('User verified successfully:', user.email);
  } catch (error) {
    console.error('Error verifying user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyUser();
