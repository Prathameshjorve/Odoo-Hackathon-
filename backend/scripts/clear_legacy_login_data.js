const prisma = require('../src/lib/prisma');

async function clearLegacy() {
  console.log('Starting legacy login data cleanup (destructive).');
  try {
    // Nullify legacy otp fields on users
    const users = await prisma.user.updateMany({ data: { otp: null, otpExpiry: null } });
    console.log('Cleared legacy otp fields on users.');

    // Delete all refresh tokens
    const rt = await prisma.refreshToken.deleteMany({});
    console.log('Deleted refresh tokens:', rt.count);

    // Delete all password reset tokens
    const pr = await prisma.passwordResetToken.deleteMany({});
    console.log('Deleted password reset tokens:', pr.count);

    // Optionally delete old email verification tokens
    const ev = await prisma.emailVerificationToken.deleteMany({});
    console.log('Deleted email verification tokens:', ev.count);

    // Optionally delete legacy otp records older than 30 days (keep recent)
    // Only if prisma.otpRecord exists (requires migration to have run)
    if (prisma.otpRecord) {
      try {
        const threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const or = await prisma.otpRecord.deleteMany({ where: { createdAt: { lt: threshold } } });
        console.log('Deleted old otp records:', or.count);
      } catch (err) {
        console.log('Warning: OtpRecord model not available (run Prisma migration to enable): ', err.message);
      }
    }

    console.log('Legacy cleanup complete.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to clear legacy data:', err);
    process.exit(1);
  }
}

clearLegacy();
