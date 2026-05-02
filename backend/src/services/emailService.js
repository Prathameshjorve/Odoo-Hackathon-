const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;
const FROM_NAME = process.env.FROM_NAME || 'Auth Service';

let transporter;

/**
 * Initialize transporter (reused from mailer.js pattern)
 */
async function initializeTransporter() {
  if (transporter) {
    return transporter;
  }

  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('SMTP credentials not configured. Using Ethereal for testing.');
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      return transporter;
    } catch (err) {
      console.error('Failed to create Ethereal test account:', err);
      return null;
    }
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
}

/**
 * Send generic email
 */
async function sendEmail(to, subject, html) {
  try {
    const mail = await initializeTransporter();
    if (!mail) {
      console.error('Email transporter not initialized');
      return false;
    }

    const info = await mail.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    console.log('Email sent:', info.messageId);
    if (!SMTP_USER || !SMTP_PASS) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return true;
  } catch (error) {
    console.error('Error sending email:', error.message);
    return false;
  }
}

/**
 * Send OTP email for signup verification
 */
async function sendSignupOtpEmail(email, otp) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; }
        .otp-box { background-color: #fff; border: 2px solid #4CAF50; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; }
        .otp-code { font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 5px; font-family: monospace; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to ${FROM_NAME}!</h1>
        </div>
        <div class="content">
          <h2>Verify Your Email Address</h2>
          <p>Thank you for signing up! Use the following OTP code to verify your email:</p>
          
          <div class="otp-box">
            <p style="margin: 0; color: #999; font-size: 14px;">Your OTP Code</p>
            <div class="otp-code">${otp}</div>
          </div>
          
          <p><strong>⏱️ This code will expire in 5 minutes.</strong></p>
          <p>If you didn't create this account, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(email, 'Your OTP Code - Verify Email', html);
}

/**
 * Send OTP email for password reset
 */
async function sendPasswordResetOtpEmail(email, otp) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; }
        .otp-box { background-color: #fff; border: 2px solid #FF9800; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; }
        .otp-code { font-size: 32px; font-weight: bold; color: #FF9800; letter-spacing: 5px; font-family: monospace; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>We received a request to reset your password. Use the following OTP code:</p>
          
          <div class="otp-box">
            <p style="margin: 0; color: #999; font-size: 14px;">Your OTP Code</p>
            <div class="otp-code">${otp}</div>
          </div>
          
          <p><strong>⏱️ This code will expire in 5 minutes.</strong></p>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(email, 'Your OTP Code - Reset Password', html);
}

module.exports = {
  sendEmail,
  sendSignupOtpEmail,
  sendPasswordResetOtpEmail,
};
