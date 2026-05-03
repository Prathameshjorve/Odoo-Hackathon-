const prisma = require('../src/lib/prisma');

async function clearCredentialsKeepAdmin() {
  console.log('Starting credential cleanup (keeping admin intact).');
  try {
    // Find admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@bookfastx.com' },
    });

    if (!adminUser) {
      console.warn('⚠️  Admin user not found. Proceeding without filtering.');
    } else {
      console.log(`✓ Found admin user: ${adminUser.email} (ID: ${adminUser.id})`);
    }

    // Delete all refresh tokens EXCEPT admin
    const rtDeleted = await prisma.refreshToken.deleteMany({
      where: adminUser
        ? { userId: { not: adminUser.id } }
        : {},
    });
    console.log(`✓ Deleted refresh tokens: ${rtDeleted.count}`);

    // Delete all password reset tokens EXCEPT admin
    const prDeleted = await prisma.passwordResetToken.deleteMany({
      where: adminUser
        ? { userId: { not: adminUser.id } }
        : {},
    });
    console.log(`✓ Deleted password reset tokens: ${prDeleted.count}`);

    // Delete all email verification tokens EXCEPT admin
    const evDeleted = await prisma.emailVerificationToken.deleteMany({
      where: adminUser
        ? { userId: { not: adminUser.id } }
        : {},
    });
    console.log(`✓ Deleted email verification tokens: ${evDeleted.count}`);

    // Delete old OTP records (except admin, and only those older than 30 days)
    if (prisma.otpRecord) {
      try {
        const threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const orDeleted = await prisma.otpRecord.deleteMany({
          where: {
            createdAt: { lt: threshold },
            ...(adminUser && { email: { not: adminUser.email } }),
          },
        });
        console.log(`✓ Deleted old OTP records: ${orDeleted.count}`);
      } catch (err) {
        console.log('ℹ️  OtpRecord model not available yet (run Prisma migration)');
      }
    }

    console.log('\n✅ Credential cleanup complete. Admin user remains intact.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to clear credentials:', err);
    process.exit(1);
  }
}

clearCredentialsKeepAdmin();
