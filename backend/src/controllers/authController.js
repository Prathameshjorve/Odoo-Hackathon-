const prisma = require("../lib/prisma");
// const { emitOrganizationCreated } = require('../socket');
const {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  updateRefreshTokenLastUsed,
  getCurrentSession,
  createEmailVerificationToken,
  verifyEmailVerificationToken,
  markEmailVerificationTokenUsed,
  createPasswordResetToken,
  verifyPasswordResetToken,
  markPasswordResetTokenUsed,
} = require("../lib/auth");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} = require("../lib/mailer");
const {
  sendSignupOtpEmail,
  sendPasswordResetOtpEmail,
} = require("../services/emailService");
const {
  generateOtp,
} = require("../utils/generateOtp");
const {
  parseUserAgent,
  generateDeviceName,
  getClientIp,
} = require("../utils/deviceParser");

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// Admin emails list - these users get super admin access
const ADMIN_EMAILS = [
  "aryan@devally.in",
  "prathameshjorve09@gmail.com",
  "admin@bookfastx.com",
];

/**
 * Register a new user
 */
async function register(req, res) {
  try {
    const { email, password, name, role, business } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format.",
      });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    // Validate role
    const userRole = role || 'USER';
    if (!['USER', 'ORGANIZATION'].includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either USER or ORGANIZATION.',
      });
    }

    // Validate business data for ORGANIZATION role
    if (userRole === 'ORGANIZATION') {
      if (!business || !business.name || !business.location) {
        return res.status(400).json({
          success: false,
          message: 'Organization name and location are required for ORGANIZATION role.',
        });
      }
      if (!business.businessHours || !Array.isArray(business.businessHours)) {
        return res.status(400).json({
          success: false,
          message: 'Business hours are required for ORGANIZATION role and must be an array.',
        });
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists.",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user and business in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || null,
          role: userRole,
          isMember: false, // ORGANIZATION users start as admins
          emailVerified: true, // Automatically verify for new users
        },
      });

      // Create organization if role is ORGANIZATION
      let organizationData = null;
      if (userRole === 'ORGANIZATION') {
        organizationData = await tx.organization.create({
          data: {
            name: business.name,
            location: business.location,
            businessHours: business.businessHours,
            description: business.description || null,
            adminId: user.id,
          },
        });

        // Update user with organizationId
        await tx.user.update({
          where: { id: user.id },
          data: { organizationId: organizationData.id },
        });
      }

      return { user, organization: organizationData };
    });

    // Emit socket event if organization was created
    // if (result.organization) {
      // emitOrganizationCreated(result.organization);
    // }

    // Generate OTP
    const { otp, otpExpiry } = generateOtp();

    // Save OTP to user for any future needs
    await prisma.user.update({
      where: { id: result.user.id },
      data: {
        otp,
        otpExpiry,
      },
    });

    // Send OTP email
    try {
      await sendSignupOtpEmail(email, otp);
    } catch (e) {
      console.log("Failed to send OTP email, but continuing since verification is disabled");
    }

    const responseData = {
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
    };

    if (result.organization) {
      responseData.organization = {
        id: result.organization.id,
        name: result.organization.name,
        location: result.organization.location,
      };
    }

    res.status(201).json({
      success: true,
      message:
        "User registered successfully. OTP has been sent to your email. Please verify within 5 minutes.",
      data: responseData,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during registration.",
    });
  }
}

/**
 * Verify email using OTP
 */
async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check if OTP exists and is not expired
    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "No OTP request found. Please sign up again or request a new OTP.",
      });
    }

    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Verify OTP
    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    // Update user: set verified and clear OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        otp: null,
        otpExpiry: null,
      },
    });

    res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during OTP verification.",
    });
  }
}

/**
 * Verify email address
 */
async function verifyEmail(req, res) {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: "Token and email are required.",
      });
    }

    // Verify token
    const verificationToken = await verifyEmailVerificationToken(token, email);

    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token.",
      });
    }

    // Update user's emailVerified status
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: true },
    });

    // Mark token as used
    await markEmailVerificationTokenUsed(verificationToken.id);

    // Send welcome email
    await sendWelcomeEmail(email, verificationToken.user.name);

    res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during email verification.",
    });
  }
}

/**
 * Login user
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Check if email is verified (REMOVED as requested)
    // if (!user.emailVerified) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Please verify your email before logging in.",
    //   });
    // }

    // Generate access token
    const accessToken = generateAccessToken(user.id, user.email);

    // Extract session metadata
    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = getClientIp(req);
    const deviceInfo = parseUserAgent(userAgent);
    const deviceName = generateDeviceName(
      deviceInfo.browser,
      deviceInfo.os,
      deviceInfo.deviceType
    );

    // Generate refresh token with session metadata
    const refreshToken = await createRefreshToken(user.id, {
      ipAddress,
      userAgent,
      deviceName,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
    });

    // Fetch complete user data with organization information
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isMember: true,
        emailVerified: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            location: true,
            businessHours: true,
            description: true,
          },
        },
        adminOrganization: {
          select: {
            id: true,
            name: true,
            location: true,
            businessHours: true,
            description: true,
          },
        },
      },
    });

    // Flatten organization name for easier access
    const userResponse = {
      ...userData,
      organizationName: userData.isMember
        ? userData.organization?.name
        : userData.adminOrganization?.name,
      isAdmin: ADMIN_EMAILS.includes(user.email.toLowerCase()),
    };

    // Set refresh token in cookie
    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    // Set isAdmin cookie if user is an admin (non-httpOnly so frontend can read it)
    if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      res.cookie("isAdmin", "true", {
        ...COOKIE_OPTIONS,
        httpOnly: false, // Allow frontend to read this cookie
      });
    } else {
      // Clear isAdmin cookie if not admin
      res.clearCookie("isAdmin");
    }

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        accessToken,
        refreshToken, // Include refresh token in response for non-cookie clients
        user: userResponse,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during login.",
    });
  }
}

/**
 * Refresh access token
 */
async function refreshToken(req, res) {
  try {
    // Try to get refresh token from cookie first, then from body (for testing)
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message:
          "Refresh token not found. Please provide refresh token in cookie or request body.",
      });
    }

    // Verify refresh token
    const tokenData = await verifyRefreshToken(refreshToken);

    if (!tokenData) {
      res.clearCookie("refreshToken");
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token.",
      });
    }

    // Update last used timestamp
    await updateRefreshTokenLastUsed(refreshToken);

    // Revoke old refresh token
    await revokeRefreshToken(refreshToken);

    // Generate new access token
    const accessToken = generateAccessToken(
      tokenData.user.id,
      tokenData.user.email
    );

    // Extract session metadata for new token
    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = getClientIp(req);
    const deviceInfo = parseUserAgent(userAgent);
    const deviceName = generateDeviceName(
      deviceInfo.browser,
      deviceInfo.os,
      deviceInfo.deviceType
    );

    // Generate new refresh token (rotation) with session metadata
    const newRefreshToken = await createRefreshToken(tokenData.user.id, {
      ipAddress,
      userAgent,
      deviceName,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
    });

    // Set new refresh token in cookie
    res.cookie("refreshToken", newRefreshToken, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
      data: {
        accessToken,
        refreshToken: newRefreshToken, // Also return in response for non-cookie clients
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during token refresh.",
    });
  }
}

/**
 * Logout user
 */
async function logout(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      // Get session info before revoking (for logging/tracking)
      const session = await getCurrentSession(refreshToken);

      if (session) {
        console.log(
          `User session logout: ${session.deviceName} at ${session.ipAddress}`
        );
      }

      // Revoke refresh token
      await revokeRefreshToken(refreshToken);
    }

    // Clear cookies
    res.clearCookie("refreshToken");
    res.clearCookie("isAdmin");

    res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during logout.",
    });
  }
}

/**
 * Request OTP for password reset (replaces token-based flow)
 */
async function requestPasswordReset(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    // Find user (prevent user enumeration by always returning success)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Generate OTP
      const { otp, otpExpiry } = generateOtp();

      // Save OTP to user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          otp,
          otpExpiry,
        },
      });

      // Send password reset OTP email
      await sendPasswordResetOtpEmail(email, otp);
    }

    // Always return success to prevent user enumeration
    res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, an OTP has been sent to reset your password.",
    });
  } catch (error) {
    console.error("Request password reset error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while processing your request.",
    });
  }
}

/**
 * Reset password using OTP (replaces token-based flow)
 */
async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;

    // Validate input
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required.",
      });
    }

    // Password strength validation
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check if OTP exists and is not expired
    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "No OTP request found. Please request a password reset.",
      });
    }

    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Verify OTP
    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user's password and clear OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        otp: null,
        otpExpiry: null,
      },
    });

    // Revoke all refresh tokens (force logout everywhere)
    await revokeAllUserRefreshTokens(user.id);

    res.status(200).json({
      success: true,
      message:
        "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during password reset.",
    });
  }
}

/**
 * Resend verification email
 */
async function resendVerificationEmail(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Prevent user enumeration - always return success
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an unverified account with that email exists, a verification email has been sent.",
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified.",
      });
    }

    // Check for recent verification token (rate limiting - prevent spam)
    const recentToken = await prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        email: email,
        used: false,
        createdAt: {
          gte: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        },
      },
    });

    if (recentToken) {
      return res.status(429).json({
        success: false,
        message:
          "Please wait 2 minutes before requesting another verification email.",
      });
    }

    // Invalidate old unused tokens for this email
    await prisma.emailVerificationToken.updateMany({
      where: {
        userId: user.id,
        email: email,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Generate new verification token
    const verificationToken = await createEmailVerificationToken(
      user.id,
      email
    );

    // Send verification email
    const verificationEmailSent = await sendVerificationEmail(email, verificationToken);
    if (!verificationEmailSent) {
      return res.status(500).json({
        success: false,
        message: 'Verification email could not be sent. Configure SMTP in backend/.env and try again.',
      });
    }

    res.status(200).json({
      success: true,
      message: "Verification email sent successfully. Please check your inbox.",
    });
  } catch (error) {
    console.error("Resend verification email error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while sending verification email.",
    });
  }
}

/**
 * Resend OTP for email verification or password reset
 */
async function resendOtp(req, res) {
  try {
    const { email, type = "signup" } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!["signup", "password-reset"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be either 'signup' or 'password-reset'.",
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account with that email exists, OTP has been resent.",
      });
    }

    // For signup type - user should not be verified yet
    if (type === "signup" && user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified.",
      });
    }

    // Generate new OTP
    const { otp, otpExpiry } = generateOtp();

    // Save new OTP to user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpiry,
      },
    });

    // Send appropriate OTP email
    if (type === "signup") {
      await sendSignupOtpEmail(email, otp);
    } else {
      await sendPasswordResetOtpEmail(email, otp);
    }

    res.status(200).json({
      success: true,
      message: "OTP has been resent to your email. It expires in 5 minutes.",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while resending OTP.",
    });
  }
}

module.exports = {
  register,
  verifyEmail,
  verifyOtp,
  login,
  refreshToken,
  logout,
  requestPasswordReset,
  resetPassword,
  resendVerificationEmail,
  resendOtp,
};
