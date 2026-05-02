/**
 * Generate a 6-digit numeric OTP with expiry time
 * OTP expires in 5 minutes (300000 milliseconds)
 */
function generateOtp() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit random number
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // Current time + 5 minutes

  return {
    otp,
    otpExpiry,
  };
}

module.exports = { generateOtp };
