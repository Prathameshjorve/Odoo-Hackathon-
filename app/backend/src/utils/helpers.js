export function validatePassword(password) {
  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const isValid = Object.values(rules).filter(Boolean).length >= 4;
  return { isValid, rules };
}

export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

import nodemailer from 'nodemailer';

export async function sendOtpEmail(to, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: 'Your verification OTP',
      text: `Your verification code is ${otp}. It expires in ${process.env.OTP_EXPIRE || '10m'}`,
    });

    return info;
  } catch (err) {
    console.error('Error sending email', err);
    throw err;
  }
}

export function formatTime(time) {
  // Convert HH:mm to time string
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function getAvailableSlots(workingHours, duration, serviceDuration, bookedSlots) {
  const slots = [];
  const [startHour, startMin] = workingHours.start.split(':').map(Number);
  const [endHour, endMin] = workingHours.end.split(':').map(Number);

  let currentHour = startHour;
  let currentMin = startMin;

  const endTotalMin = endHour * 60 + endMin;
  const durationMin = serviceDuration + duration;

  while (currentHour * 60 + currentMin + durationMin <= endTotalMin) {
    const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

    if (!bookedSlots.includes(timeStr)) {
      slots.push(timeStr);
    }

    currentMin += duration;
    if (currentMin >= 60) {
      currentHour += Math.floor(currentMin / 60);
      currentMin = currentMin % 60;
    }
  }

  return slots;
}

export function isWorkingDay(date, daysAvailable) {
  const day = new Date(date).getDay();
  return daysAvailable.includes(day);
}

export function sendResponse(res, statusCode, success, data, message = '') {
  res.status(statusCode).json({
    success,
    data,
    message,
  });
}

export function sendError(res, statusCode, message) {
  res.status(statusCode).json({
    success: false,
    message,
  });
}
