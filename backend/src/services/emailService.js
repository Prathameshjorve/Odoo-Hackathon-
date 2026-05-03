const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;
const FROM_NAME = process.env.FROM_NAME || 'BookFastX';

let transporter;

/**
 * Initialize transporter with Gmail optimized settings
 */
async function initializeTransporter() {
  if (transporter) return transporter;

  console.log('📧 Initializing Email Service (Gmail SMTP)...');
  
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('⚠️ SMTP credentials not configured. Using Ethereal for testing.');
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
      console.log('✅ Ethereal transporter created');
      return transporter;
    } catch (err) {
      console.error('❌ Failed to create Ethereal test account:', err);
      return null;
    }
  }

  // Gmail SMTP configuration
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // 587 uses STARTTLS
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
  } catch (error) {
    console.error('❌ SMTP verification failed:', error.message);
    console.error('   Note: Ensure you are using an "App Password" if using Gmail.');
  }

  return transporter;
}

/**
 * Send generic email
 */
async function sendEmail(to, subject, html) {
  try {
    const mail = await initializeTransporter();
    if (!mail) {
      console.error('❌ Email transporter not initialized');
      return false;
    }

    const info = await mail.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    console.log('✅ Email sent successfully:', info.messageId);
    if (!SMTP_USER || !SMTP_PASS) {
      console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    if (error.code === 'EAUTH') {
      console.error('   Authentication failed. Please check your SMTP_USER and SMTP_PASS.');
    }
    return false;
  }
}

/**
 * Send OTP email for signup verification
 */
async function sendSignupOtpEmail(email, otp) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      <div style="background-color: #0056b3; color: white; padding: 20px; text-align: center;">
        <h1>BookFastX</h1>
      </div>
      <div style="padding: 30px; line-height: 1.6;">
        <h2>Verify Your Email</h2>
        <p>Thank you for signing up! Please use the following code to verify your account:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0056b3;">${otp}</span>
        </div>
        <p>This code will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
      </div>
      <div style="background: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #777;">
        &copy; ${new Date().getFullYear()} BookFastX. All rights reserved.
      </div>
    </div>
  `;

  return await sendEmail(email, 'Your OTP Code - BookFastX', html);
}

/**
 * Send OTP email for password reset
 */
async function sendPasswordResetOtpEmail(email, otp) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      <div style="background-color: #f39c12; color: white; padding: 20px; text-align: center;">
        <h1>BookFastX</h1>
      </div>
      <div style="padding: 30px; line-height: 1.6;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Use the following code to proceed:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #f39c12;">${otp}</span>
        </div>
        <p>This code will expire in 10 minutes. If you didn't request this, your password will remain unchanged.</p>
      </div>
      <div style="background: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #777;">
        &copy; ${new Date().getFullYear()} BookFastX. All rights reserved.
      </div>
    </div>
  `;

  return await sendEmail(email, 'Reset Your Password - BookFastX', html);
}

module.exports = {
  sendEmail,
  sendSignupOtpEmail,
  sendPasswordResetOtpEmail,
};
