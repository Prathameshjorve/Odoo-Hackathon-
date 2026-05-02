const crypto = require('crypto');

/**
 * Generate a secure random token
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a token using SHA-256
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a random numeric code (for OTP, etc.)
 */
function generateNumericCode(length = 6) {
  const digits = '0123456789';
  let code = '';
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    code += digits[randomBytes[i] % digits.length];
  }

  return code;
}

module.exports = {
  generateSecureToken,
  hashToken,
  generateNumericCode,
};
