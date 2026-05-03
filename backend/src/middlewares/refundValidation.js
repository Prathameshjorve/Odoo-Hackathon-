const { body, param } = require('express-validator');

const requestRefundValidation = [
  param('bookingId').isString().notEmpty().withMessage('bookingId is required'),
  body('reason').optional().isString().isLength({ max: 500 }).withMessage('Reason too long'),
];

const processRefundValidation = [
  param('refundId').isString().notEmpty().withMessage('refundId is required'),
  body('overrideAmount').optional().isInt({ min: 0 }).withMessage('overrideAmount must be integer cents'),
  body('overrideReason').optional().isString().isLength({ max: 500 }),
];

module.exports = { requestRefundValidation, processRefundValidation };
