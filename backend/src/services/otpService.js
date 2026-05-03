const prisma = require('../lib/prisma');
const { sendOtpEmail } = require('../lib/mailer');

class OtpService {
  async sendOtp(email, purpose) {
    email = String(email).toLowerCase();
    const now = new Date();

    // Rate limiting: max 3 per minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentCount = await prisma.otpRecord.count({ where: { email, purpose, createdAt: { gte: oneMinuteAgo } } });
    if (recentCount >= 3) {
      throw new Error('Too many OTP requests. Please wait a minute and try again.');
    }

    // Rate limiting: max 10 per day
    const startOfDay = new Date(now);
    startOfDay.setHours(0,0,0,0);
    const dailyCount = await prisma.otpRecord.count({ where: { email, purpose, createdAt: { gte: startOfDay } } });
    if (dailyCount >= 10) {
      throw new Error('Daily OTP request limit reached. Try again tomorrow.');
    }

    // Invalidate previous unverified OTPs
    await prisma.otpRecord.updateMany({ where: { email, purpose, verifiedAt: null, expiresAt: { gt: now } }, data: { expiresAt: now } });

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const record = await prisma.otpRecord.create({ data: { email, otpCode, purpose, expiresAt } });

    // Update lastOtpSentAt on user if exists
    await prisma.user.updateMany({ where: { email }, data: { lastOtpSentAt: now } });

    // Send email using existing mailer
    try {
      await sendOtpEmail(email, otpCode, purpose);
    } catch (err) {
      console.error('Failed to send OTP email', err);
    }

    return { success: true, otpId: record.id, expiresAt: record.expiresAt };
  }

  async verifyOtp(email, otpCode, purpose) {
    email = String(email).toLowerCase();
    const now = new Date();

    // Find latest unverified OTP for this email+purpose
    const otp = await prisma.otpRecord.findFirst({ where: { email, purpose }, orderBy: { createdAt: 'desc' } });
    if (!otp) throw new Error('No OTP found for this email');

    if (otp.verifiedAt) return { success: true, message: 'Already verified' };

    if (otp.attempts >= 3) {
      // lockout
      await prisma.otpRecord.update({ where: { id: otp.id }, data: { expiresAt: now } });
      throw new Error('Maximum verification attempts exceeded');
    }

    if (otp.expiresAt < now) {
      throw new Error('OTP expired');
    }

    if (String(otp.otpCode) !== String(otpCode)) {
      // increment attempts
      await prisma.otpRecord.update({ where: { id: otp.id }, data: { attempts: otp.attempts + 1 } });
      const attemptsLeft = Math.max(0, 3 - (otp.attempts + 1));
      throw new Error(`Invalid OTP. ${attemptsLeft} attempts left.`);
    }

    // success
    await prisma.otpRecord.update({ where: { id: otp.id }, data: { verifiedAt: now } });

    // If purpose is SIGNUP, mark user as emailVerified (user may not exist yet until register completes)
    if (purpose === 'SIGNUP') {
      // only update if user already exists
      await prisma.user.updateMany({ where: { email }, data: { emailVerified: true } });
    }

    return { success: true, message: 'OTP verified' };
  }

  async resendOtp(email, purpose) {
    // same as sendOtp but reuse rate-limiting
    return this.sendOtp(email, purpose);
  }
}

module.exports = new OtpService();
