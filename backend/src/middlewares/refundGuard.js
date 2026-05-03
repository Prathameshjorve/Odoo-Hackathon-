const rateLimit = require('express-rate-limit');
const prisma = require('../lib/prisma');

const refundGuard = {
  rateLimit: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    keyGenerator: (req) => `${req.user?.id || req.ip}-refund-requests`,
    standardHeaders: true,
    legacyHeaders: false,
  }),

  checkEligibility: async (req, res, next) => {
    try {
      const bookingId = req.params.bookingId || req.body.bookingId;
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { appointment: { include: { organization: true } }, refundTransaction: true },
      });

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      if (booking.userId !== req.user?.id && booking.appointment?.organization?.adminId !== req.user?.id) {
        return res.status(403).json({ success: false, message: 'Not authorized for this booking' });
      }

      if (booking.paymentStatus !== 'PAID') {
        return res.status(400).json({ success: false, message: 'Booking payment is not eligible for refund' });
      }

      if (booking.refundTransaction) {
        return res.status(409).json({ success: false, message: 'Refund already exists for this booking' });
      }

      if (new Date(booking.startTime) <= new Date()) {
        return res.status(400).json({ success: false, message: 'Event already started' });
      }

      return next();
    } catch (error) {
      console.error('refundGuard.checkEligibility error:', error);
      return res.status(500).json({ success: false, message: 'Refund eligibility check failed' });
    }
  },
};

module.exports = { refundGuard };
