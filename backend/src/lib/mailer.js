const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;
const FROM_NAME = process.env.FROM_NAME || 'Auth API';
const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

let transporter;

/**
 * Initialize email transporter
 */
function initializeMailer() {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('SMTP credentials not configured. Email functionality will not work.');
    return null;
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
 * Send email
 */
async function sendEmail(to, subject, html) {
  if (!transporter) {
    console.warn('Email not sent - transporter not initialized');
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error.message);
    return false;
  }
}

/**
 * Send email verification email
 */
async function sendVerificationEmail(email, token) {
  const verificationUrl = `${BASE_URL}/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
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
          <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(email, 'Verify Your Email Address', html);
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email, token) {
  // Use frontend URL for password reset (not backend)
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #FF9800; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
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
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
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

  return await sendEmail(email, 'Reset Your Password', html);
}

/**
 * Send welcome email (after verification)
 */
async function sendWelcomeEmail(email, name) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to ${FROM_NAME}!</h1>
        </div>
        <div class="content">
          <h2>Hello ${name || 'there'}!</h2>
          <p>Your email has been verified successfully. You're all set to start using our service!</p>
          <p>Thank you for joining us.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(email, 'Welcome!', html);
}

/**
 * Send member invitation email
 */
async function sendMemberInvitationEmail(email, organizationName, password, adminName) {
  const loginUrl = `${BASE_URL.replace(':4000', ':3000')}/login`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #9333ea; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #9333ea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .credentials { background-color: #fff; border: 2px solid #9333ea; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .highlight { background-color: #fef3c7; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 You've Been Invited!</h1>
        </div>
        <div class="content">
          <h2>Welcome to ${organizationName}</h2>
          <p>Hello!</p>
          <p><strong>${adminName}</strong> has invited you to join <strong>${organizationName}</strong> as a team member.</p>
          
          <div class="credentials">
            <h3 style="margin-top: 0; color: #9333ea;">📧 Your Login Credentials</h3>
            <p><strong>Email:</strong> <span class="highlight">${email}</span></p>
            <p><strong>Password:</strong> <span class="highlight">${password}</span></p>
          </div>
          
          <p><strong>⚠️ Important:</strong> Please change your password after your first login for security.</p>
          
          <div style="text-align: center;">
            <a href="${loginUrl}" class="button">Login to Dashboard</a>
          </div>
          
          <p>As a member of ${organizationName}, you'll have access to:</p>
          <ul>
            <li>View and manage organization resources</li>
            <li>Access appointment schedules</li>
            <li>Collaborate with other team members</li>
            <li>View organization settings</li>
          </ul>
          
          <p>If you have any questions, please contact your organization administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(email, `Invitation to Join ${organizationName}`, html);
}

/**
 * Send notification email (generic for all notification types)
 */
async function sendNotificationEmail(email, notificationType, title, message, actionUrl = null) {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const fullActionUrl = actionUrl ? `${FRONTEND_URL}${actionUrl}` : null;

  // Determine notification color and icon based on type
  const notificationStyles = {
    BOOKING_CREATED: { color: '#10b981', icon: '📅', emoji: '🎉' },
    BOOKING_CANCELLED: { color: '#ef4444', icon: '❌', emoji: '⚠️' },
    BOOKING_CONFIRMED: { color: '#3b82f6', icon: '✅', emoji: '✓' },
    APPOINTMENT_CREATED: { color: '#8b5cf6', icon: '📋', emoji: '✨' },
    APPOINTMENT_UPDATED: { color: '#f59e0b', icon: '📝', emoji: '🔄' },
    APPOINTMENT_PUBLISHED: { color: '#06b6d4', icon: '🌐', emoji: '🚀' },
    MEMBER_ADDED: { color: '#ec4899', icon: '👥', emoji: '👋' },
    MEMBER_REMOVED: { color: '#f43f5e', icon: '👤', emoji: '👋' },
    RESOURCE_CREATED: { color: '#14b8a6', icon: '🏢', emoji: '✨' },
    RESOURCE_DELETED: { color: '#f97316', icon: '🗑️', emoji: '🗑️' },
    ORGANIZATION_UPDATED: { color: '#6366f1', icon: '⚙️', emoji: '🔧' },
    EMAIL_VERIFIED: { color: '#22c55e', icon: '✉️', emoji: '✓' },
    PASSWORD_CHANGED: { color: '#eab308', icon: '🔒', emoji: '🔐' },
    default: { color: '#6b7280', icon: '🔔', emoji: '📢' },
  };

  const style = notificationStyles[notificationType] || notificationStyles.default;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${style.color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .icon { font-size: 48px; margin-bottom: 10px; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .message-box { background-color: white; padding: 20px; border-left: 4px solid ${style.color}; margin: 20px 0; border-radius: 4px; }
        .button { display: inline-block; padding: 12px 30px; background-color: ${style.color}; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .notification-type { background-color: ${style.color}20; color: ${style.color}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon">${style.icon}</div>
          <h1>${style.emoji} ${title}</h1>
        </div>
        <div class="content">
          <span class="notification-type">${notificationType.replace(/_/g, ' ')}</span>
          
          <div class="message-box">
            <p style="margin: 0; font-size: 16px;">${message}</p>
          </div>
          
          ${fullActionUrl ? `
            <div style="text-align: center;">
              <a href="${fullActionUrl}" class="button">View Details</a>
            </div>
            <p style="text-align: center; color: #666; font-size: 14px;">Or copy this link: <br><span style="word-break: break-all;">${fullActionUrl}</span></p>
          ` : ''}
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            You received this email because you have notifications enabled for your account.
            You can manage your notification preferences in your account settings.
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.</p>
          <p style="margin-top: 10px;">
            <a href="${FRONTEND_URL}/dashboard/notifications" style="color: #666; text-decoration: none;">View All Notifications</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(email, `${style.emoji} ${title}`, html);
}

module.exports = {
  initializeMailer,
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendMemberInvitationEmail,
  sendNotificationEmail,
};
