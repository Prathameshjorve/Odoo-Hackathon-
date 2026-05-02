import { User } from '../models/index.js';
import { generateToken } from '../middleware/auth.js';
import { validatePassword, sendResponse, sendError, generateOTP, sendOtpEmail } from '../utils/helpers.js';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';

export async function signup(req, res) {
  try {
    const { name, email, password, role = 'customer' } = req.body;

    if (!name || !email || !password) {
      return sendError(res, 400, 'Please provide all required fields');
    }

    // Validate password strength
    const { isValid } = validatePassword(password);
    if (!isValid) {
      return sendError(res, 400, 'Password must contain at least 8 characters, uppercase, lowercase, number, and special character');
    }

    // Check if user already exists (case-insensitive)
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) return sendError(res, 400, 'Email already in use');

    const hashed = await bcrypt.hash(password, 10);

    const otp = generateOTP();
    const otpExpire = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRE_MINUTES || '10') * 60 * 1000));

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role,
      otp,
      otpExpire,
    });

    // send OTP email (non-blocking log on error)
    try {
      await sendOtpEmail(email, otp);
    } catch (err) {
      console.error('Failed sending OTP email', err.message || err);
    }

    const token = generateToken(user.id);

    sendResponse(res, 201, true, { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } }, 'User created successfully. OTP sent to email');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Please provide email and password');
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) return sendError(res, 401, 'Invalid credentials');

    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (!isPasswordMatched) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await user.save();
      return sendError(res, 401, 'Invalid credentials');
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return sendError(res, 403, 'Account locked due to multiple failed login attempts. Try again later.');
    }

    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user.id);

    sendResponse(res, 200, true, { token, user: { id: user.id, name: user.name, email: user.email, role: user.role, isEmailVerified: user.isEmailVerified } }, 'Logged in successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function verifyOTP(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return sendError(res, 400, 'Please provide email and OTP');
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) return sendError(res, 404, 'User not found');

    if (!user.otp || !user.otpExpire || user.otp !== otp || new Date() > user.otpExpire) {
      return sendError(res, 400, 'Invalid or expired OTP');
    }

    user.isEmailVerified = true;
    user.otp = null;
    user.otpExpire = null;
    await user.save();

    sendResponse(res, 200, true, { user: { id: user.id, name: user.name, email: user.email, role: user.role } }, 'Email verified successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function resendOTP(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, 400, 'Please provide email');
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) return sendError(res, 404, 'User not found');

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpire = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRE_MINUTES || '10') * 60 * 1000));
    await user.save();

    try {
      await sendOtpEmail(email, otp);
    } catch (err) {
      console.error('Failed sending OTP email', err.message || err);
    }

    sendResponse(res, 200, true, null, 'OTP resent successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, 400, 'Please provide email');
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) return sendError(res, 404, 'User not found');

    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    user.resetToken = resetToken;
    user.resetTokenExpire = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    console.log(`Reset token for ${email}: ${resetToken}`);

    sendResponse(res, 200, true, null, 'Password reset link sent to email');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function resetPassword(req, res) {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return sendError(res, 400, 'Please provide reset token and new password');
    }

    const { isValid } = validatePassword(newPassword);
    if (!isValid) {
      return sendError(res, 400, 'Password must contain at least 8 characters, uppercase, lowercase, number, and special character');
    }

    const user = await User.findOne({ where: { resetToken, resetTokenExpire: { [Op.gt]: new Date() } } });
    if (!user) return sendError(res, 400, 'Invalid or expired reset token');

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.resetToken = null;
    user.resetTokenExpire = null;
    await user.save();

    sendResponse(res, 200, true, null, 'Password reset successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getProfile(req, res) {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return sendError(res, 404, 'User not found');

    sendResponse(res, 200, true, user, 'Profile fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function updateProfile(req, res) {
  try {
    const { name, phone, bio, avatar } = req.body;

    const user = await User.findByPk(req.userId);
    if (!user) return sendError(res, 404, 'User not found');

    user.name = name ?? user.name;
    user.phone = phone ?? user.phone;
    user.bio = bio ?? user.bio;
    user.avatar = avatar ?? user.avatar;
    await user.save();

    sendResponse(res, 200, true, user, 'Profile updated successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}
