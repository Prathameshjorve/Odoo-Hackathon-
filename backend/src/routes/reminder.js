const express = require('express');
const { getUpcomingBookings, getBookingsInTimeWindow, sendWhatsAppReminders } = require('../controllers/reminderController');

const router = express.Router();

/**
 * @route   GET /reminders/upcoming
 * @desc    Get all bookings scheduled in the next 6 hours (for n8n scheduler)
 * @access  Public (but should be protected with API key in production)
 */
router.get('/upcoming', getUpcomingBookings);

/**
 * @route   GET /reminders/time-window
 * @desc    Get bookings in a flexible time window
 * @query   hoursAhead - Number of hours to look ahead (default: 6)
 * @access  Public (but should be protected with API key in production)
 */
router.get('/time-window', getBookingsInTimeWindow);

/**
 * @route   POST /reminders/send-whatsapp
 * @desc    Get upcoming bookings AND send WhatsApp reminders to all users
 * @access  Public (but should be protected with API key in production)
 */
router.post('/send-whatsapp', sendWhatsAppReminders);

module.exports = router;
