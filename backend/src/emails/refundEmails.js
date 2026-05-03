const { sendEmail } = require('../lib/mailer');

async function refundRequestEmailToAdmin(adminEmail, data) {
  const html = `<p>Refund request received for booking <strong>${data.bookingId}</strong>.</p>
  <p>User: ${data.userEmail}</p>
  <p>Amount: ${data.amount}</p>
  <p>Reason: ${data.reason || 'N/A'}</p>
  <p><em>Please review and process the refund in the admin dashboard.</em></p>`;

  return await sendEmail(adminEmail, `Refund request: ${data.bookingId}`, html);
}

async function refundProcessedEmailToUser(userEmail, data) {
  const html = `<p>Your refund for booking <strong>${data.bookingId}</strong> has been processed.</p>
  <p>Amount refunded: ${data.amount}</p>
  <p>Reference: ${data.refundId || data.razorpayRefundId || ''}</p>`;

  return await sendEmail(userEmail, `Refund processed: ${data.bookingId}`, html);
}

async function refundFailedEmailToAdmin(adminEmail, data) {
  const html = `<p>Refund failed for booking <strong>${data.bookingId}</strong>.</p>
  <p>Error: ${data.error}</p>`;

  return await sendEmail(adminEmail, `Refund failed: ${data.bookingId}`, html);
}

module.exports = { refundRequestEmailToAdmin, refundProcessedEmailToUser, refundFailedEmailToAdmin };
