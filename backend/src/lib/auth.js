const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = require('./prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '60m';
const REFRESH_TOKEN_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '60');
const BCRYPT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password against hash
 */
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
function generateAccessToken(userId, email) {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify JWT access token
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Generate a secure random token
 */
function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token for storage
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create and store a refresh token with session metadata
 */
async function createRefreshToken(userId, sessionMetadata = {}) {
  const token = generateSecureToken();
  const hashedToken = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

  await prisma.refreshToken.create({
    data: {
      token: hashedToken,
      userId,
      expiresAt,
      ipAddress: sessionMetadata.ipAddress || null,
      userAgent: sessionMetadata.userAgent || null,
      deviceName: sessionMetadata.deviceName || null,
      deviceType: sessionMetadata.deviceType || null,
      browser: sessionMetadata.browser || null,
      os: sessionMetadata.os || null,
    },
  });

  return token;
}

/**
 * Verify and retrieve refresh token from database
 */
async function verifyRefreshToken(token) {
  const hashedToken = hashToken(token);

  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token: hashedToken },
    include: { user: true },
  });

  if (!refreshToken) {
    return null;
  }

  // Check if token is expired
  if (new Date() > refreshToken.expiresAt) {
    return null;
  }

  // Check if token is revoked
  if (refreshToken.revoked) {
    return null;
  }

  return refreshToken;
}

/**
 * Revoke a refresh token
 */
async function revokeRefreshToken(token) {
  const hashedToken = hashToken(token);

  await prisma.refreshToken.updateMany({
    where: { token: hashedToken },
    data: { revoked: true },
  });
}

/**
 * Revoke all refresh tokens for a user
 */
async function revokeAllUserRefreshTokens(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { revoked: true },
  });
}

/**
 * Update last used timestamp for a refresh token
 */
async function updateRefreshTokenLastUsed(token) {
  const hashedToken = hashToken(token);

  await prisma.refreshToken.updateMany({
    where: { token: hashedToken },
    data: { lastUsedAt: new Date() },
  });
}

/**
 * Get all active sessions for a user
 */
async function getUserActiveSessions(userId) {
  return await prisma.refreshToken.findMany({
    where: {
      userId,
      revoked: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
      ipAddress: true,
      deviceName: true,
      deviceType: true,
      browser: true,
      os: true,
    },
    orderBy: {
      lastUsedAt: 'desc',
    },
  });
}

/**
 * Revoke a specific session by ID
 */
async function revokeSessionById(sessionId, userId) {
  const result = await prisma.refreshToken.updateMany({
    where: {
      id: sessionId,
      userId,
    },
    data: { revoked: true },
  });

  return result.count > 0;
}

/**
 * Get current session from refresh token
 */
async function getCurrentSession(token) {
  const hashedToken = hashToken(token);

  return await prisma.refreshToken.findUnique({
    where: { token: hashedToken },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
      ipAddress: true,
      deviceName: true,
      deviceType: true,
      browser: true,
      os: true,
      revoked: true,
    },
  });
}

/**
 * Create email verification token
 */
async function createEmailVerificationToken(userId, email) {
  const token = generateSecureToken();
  const hashedToken = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

  await prisma.emailVerificationToken.create({
    data: {
      token: hashedToken,
      userId,
      email,
      expiresAt,
    },
  });

  return token;
}

/**
 * Verify email verification token
 */
async function verifyEmailVerificationToken(token, email) {
  const hashedToken = hashToken(token);

  const verificationToken = await prisma.emailVerificationToken.findFirst({
    where: {
      token: hashedToken,
      email,
      used: false,
    },
    include: { user: true },
  });

  if (!verificationToken) {
    return null;
  }

  // Check if token is expired
  if (new Date() > verificationToken.expiresAt) {
    return null;
  }

  return verificationToken;
}

/**
 * Mark email verification token as used
 */
async function markEmailVerificationTokenUsed(tokenId) {
  await prisma.emailVerificationToken.update({
    where: { id: tokenId },
    data: { used: true },
  });
}

/**
 * Create password reset token
 */
async function createPasswordResetToken(userId, email) {
  const token = generateSecureToken();
  const hashedToken = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      token: hashedToken,
      userId,
      email,
      expiresAt,
    },
  });

  return token;
}

/**
 * Verify password reset token
 */
async function verifyPasswordResetToken(token, email) {
  const hashedToken = hashToken(token);

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      token: hashedToken,
      email,
      used: false,
    },
    include: { user: true },
  });

  if (!resetToken) {
    return null;
  }

  // Check if token is expired
  if (new Date() > resetToken.expiresAt) {
    return null;
  }

  return resetToken;
}

/**
 * Mark password reset token as used
 */
async function markPasswordResetTokenUsed(tokenId) {
  await prisma.passwordResetToken.update({
    where: { id: tokenId },
    data: { used: true },
  });
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  verifyAccessToken,
  generateSecureToken,
  hashToken,
  createRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  updateRefreshTokenLastUsed,
  getUserActiveSessions,
  revokeSessionById,
  getCurrentSession,
  createEmailVerificationToken,
  verifyEmailVerificationToken,
  markEmailVerificationTokenUsed,
  createPasswordResetToken,
  verifyPasswordResetToken,
  markPasswordResetTokenUsed,
};
