import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { validatePassword, sendResponse, sendError } from '../utils/helpers.js';

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

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(res, 400, 'Email already in use');
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role,
    });

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    // In production, send OTP via email
    console.log(`OTP for ${email}: ${otp}`);

    const token = generateToken(user._id);

    sendResponse(res, 201, true, { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } }, 'User created successfully. OTP sent to email');
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

    // Check if user exists and get password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return sendError(res, 401, 'Invalid credentials');
    }

    // Check if password matches
    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
      }
      await user.save();
      return sendError(res, 401, 'Invalid credentials');
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      return sendError(res, 403, 'Account locked due to multiple failed login attempts. Try again later.');
    }

    // Reset login attempts and unlock
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    sendResponse(res, 200, true, { token, user: { id: user._id, name: user.name, email: user.email, role: user.role, isEmailVerified: user.isEmailVerified } }, 'Logged in successfully');
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

    const user = await User.findOne({ email: email.toLowerCase() }).select('+otp +otpExpire');
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    if (!user.verifyOTP(otp)) {
      return sendError(res, 400, 'Invalid or expired OTP');
    }

    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    sendResponse(res, 200, true, { user: { id: user._id, name: user.name, email: user.email, role: user.role } }, 'Email verified successfully');
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

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const otp = user.generateOTP();
    await user.save();

    // In production, send OTP via email
    console.log(`OTP for ${email}: ${otp}`);

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

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Generate reset token (mock implementation)
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    user.resetToken = resetToken;
    user.resetTokenExpire = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save();

    // In production, send reset link via email
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

    const user = await User.findOne({
      resetToken,
      resetTokenExpire: { $gt: new Date() },
    });

    if (!user) {
      return sendError(res, 400, 'Invalid or expired reset token');
    }

    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;
    await user.save();

    sendResponse(res, 200, true, null, 'Password reset successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getProfile(req, res) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    sendResponse(res, 200, true, user, 'Profile fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function updateProfile(req, res) {
  try {
    const { name, phone, bio, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, phone, bio, avatar },
      { new: true, runValidators: true }
    );

    sendResponse(res, 200, true, user, 'Profile updated successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}
