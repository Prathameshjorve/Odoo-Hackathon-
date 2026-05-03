const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const otpService = require('../services/otpService');
const { generateTokens, setRefreshTokenCookie } = require('../lib/auth');

class OtpAuthController {
  // Register with OTP - two-step process
  async register(req, res) {
    try {
      const { email, name, password, role = 'USER', otpCode } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Email required' });

      const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      // If OTP provided -> Step 2: verify and create user (password required)
      if (otpCode) {
        if (!password) return res.status(400).json({ success: false, message: 'Password required when verifying OTP' });
        // Verify OTP
        await otpService.verifyOtp(email, otpCode, 'SIGNUP');
        const hashedPassword = await bcrypt.hash(password, 12);
        // Prevent duplicate creation
        if (existingUser) return res.status(409).json({ success: false, message: 'Email already registered' });
        const user = await prisma.user.create({
          data: { email: email.toLowerCase(), name, password: hashedPassword, role, emailVerified: true }
        });
        const tokens = await generateTokens(user.id);
        setRefreshTokenCookie(res, tokens.refreshToken);
        return res.status(201).json({ success: true, message: 'Registration successful', data: { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
      }

      // Step 1: Send OTP only (no password required yet)
      if (existingUser) return res.status(409).json({ success: false, message: 'Email already registered' });
      const otpResult = await otpService.sendOtp(email, 'SIGNUP');
      res.status(200).json({ success: true, message: 'OTP sent to your email. Verify to set password.', data: { email, requiresOtp: true, expiresAt: otpResult.expiresAt } });
    } catch (err) {
      console.error('Register OTP error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to send OTP' });
    }
  }

  // Login with OTP - two-step process
  async login(req, res) {
    try {
      const { email, password, otpCode } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Email required' });

      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

      if (otpCode) {
        // Step 2: Verify OTP and complete login
        await otpService.verifyOtp(email, otpCode, 'LOGIN');
        const tokens = await generateTokens(user.id);
        setRefreshTokenCookie(res, tokens.refreshToken);
        return res.status(200).json({ success: true, message: 'Login successful', data: { user: { id: user.id, email: user.email, name: user.name, role: user.role }, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
      }

      // Step 1: Verify password and send OTP
      if (!password) return res.status(400).json({ success: false, message: 'Password required' });
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) return res.status(401).json({ success: false, message: 'Invalid credentials' });

      await otpService.sendOtp(email, 'LOGIN');
      res.status(200).json({ success: true, message: 'OTP sent to your email', data: { email, requiresOtp: true } });
    } catch (err) {
      console.error('Login OTP error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to login with OTP' });
    }
  }

  // Password reset with OTP
  async forgotPassword(req, res) {
    try {
      const { email, otpCode, newPassword } = req.body;

      if (otpCode && newPassword) {
        // Step 2: Verify OTP and reset password
        await otpService.verifyOtp(email, otpCode, 'PASSWORD_RESET');
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({ where: { email: email.toLowerCase() }, data: { password: hashedPassword } });
        return res.status(200).json({ success: true, message: 'Password reset successful. Please login.' });
      }

      // Step 1: Send OTP for password reset
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!user) return res.status(200).json({ success: true, message: 'If an account exists, OTP will be sent' });

      await otpService.sendOtp(email, 'PASSWORD_RESET');
      res.status(200).json({ success: true, message: 'OTP sent to your email', data: { email, requiresOtp: true } });
    } catch (err) {
      console.error('Forgot password OTP error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to process password reset OTP' });
    }
  }

  // Resend OTP
  async resendOtp(req, res) {
    try {
      const { email, purpose } = req.body;
      if (!email || !purpose) return res.status(400).json({ success: false, message: 'Email and purpose required' });
      const result = await otpService.resendOtp(email, purpose);
      res.status(200).json({ success: true, message: 'OTP resent successfully', data: { expiresAt: result.expiresAt } });
    } catch (err) {
      console.error('Resend OTP error:', err);
      res.status(400).json({ success: false, message: err.message || 'Failed to resend OTP' });
    }
  }

  async verifyForgotPasswordOtp(req, res) {
    try {
      const { email, otpCode } = req.body;
      if (!email || !otpCode) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required' });
      }

      await otpService.verifyOtp(email, otpCode, 'PASSWORD_RESET');
      return res.status(200).json({ success: true, message: 'OTP verified' });
    } catch (err) {
      console.error('Verify forgot password OTP error:', err);
      return res.status(400).json({ success: false, message: err.message || 'Failed to verify OTP' });
    }
  }

  async completeForgotPasswordReset(req, res) {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) {
        return res.status(400).json({ success: false, message: 'Email and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
      }

      const now = new Date();
      const otp = await prisma.otpRecord.findFirst({
        where: {
          email: email.toLowerCase(),
          purpose: 'PASSWORD_RESET',
          verifiedAt: { not: null },
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!otp) {
        return res.status(400).json({ success: false, message: 'Please verify OTP before resetting your password' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: { password: hashedPassword },
      });

      await prisma.otpRecord.updateMany({
        where: { email: email.toLowerCase(), purpose: 'PASSWORD_RESET' },
        data: { expiresAt: now },
      });

      return res.status(200).json({ success: true, message: 'Password reset successful. Please login.' });
    } catch (err) {
      console.error('Complete forgot password reset error:', err);
      return res.status(400).json({ success: false, message: err.message || 'Failed to reset password' });
    }
  }

  async testMail(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Email required' });
      
      const { sendEmail } = require('../lib/mailer');
      const result = await sendEmail(
        email, 
        'Test Email from BookFastX', 
        '<h1>Hello!</h1><p>This is a test email to verify your SMTP configuration is working correctly.</p>'
      );
      
      if (result) {
        res.json({ success: true, message: 'Test email sent successfully' });
      } else {
        res.status(500).json({ success: false, message: 'Failed to send test email. Check server logs for errors.' });
      }
    } catch (err) {
      console.error('Test mail error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new OtpAuthController();
