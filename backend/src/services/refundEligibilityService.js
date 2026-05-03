const prisma = require('../lib/prisma');

function buildRefundMessage({ percentage, hoursUntil, originalAmount, refundAmount, emergencyRefund, overrideAmount, ruleApplied }) {
  if (emergencyRefund) {
    return `Emergency refund approved: you will receive ${refundAmount} back regardless of the deadline.`;
  }

  if (overrideAmount !== null && overrideAmount !== undefined) {
    return `Admin override applied: your refund has been set to ${refundAmount}.`;
  }

  if (percentage >= 100) {
    return `You will receive a full refund because you are cancelling ${hoursUntil} hours before the appointment.`;
  }

  if (percentage > 0) {
    return `You will receive ${percentage}% refund because you are cancelling ${hoursUntil} hours before the appointment.`;
  }

  return 'No refund is available for this cancellation window.';
}

const DEFAULT_POLICY = {
  fullRefundHours: 48,
  partialRefundHours: 24,
  partialRefundPercent: 50,
  globalProcessingFee: 0,
  processingFee: 0,
  requiresApproval: true,
  rules: [],
  isDefault: true,
};

/**
 * Internal helper to calculate refund logic given a policy object.
 */
function calculateWithPolicy(booking, policy, originalAmount, options = {}) {
  const now = options.currentTime ? new Date(options.currentTime) : new Date();
  const start = new Date(booking.startTime);

  if (now >= start) {
    return {
      eligible: false,
      refundAmount: 0,
      originalAmount,
      reason: 'Event already started',
      policy,
      breakdown: {
        originalAmount,
        refundAmount: 0,
        processingFee: 0,
        finalAmount: 0,
        ruleApplied: 'EVENT_STARTED',
      },
    };
  }

  const msUntil = start.getTime() - now.getTime();
  const hoursUntil = Math.floor(msUntil / (1000 * 60 * 60));
  const processingFee = Number(policy.processingFee || policy.globalProcessingFee || 0);
  const emergencyRefund = Boolean(options.emergencyRefund);
  const overrideAmount = options.overrideAmount !== undefined && options.overrideAmount !== null ? Number(options.overrideAmount) : null;

  if (emergencyRefund) {
    const amount = Math.max(0, overrideAmount !== null ? overrideAmount : originalAmount - processingFee);
    return {
      eligible: true,
      refundAmount: amount,
      originalAmount,
      reason: 'Emergency refund approved',
      policy,
      ruleApplied: 'EMERGENCY_REFUND',
      breakdown: {
        originalAmount,
        refundAmount: amount,
        processingFee,
        finalAmount: Math.max(0, amount - processingFee),
        ruleApplied: 'EMERGENCY_REFUND',
      },
      message: buildRefundMessage({
        percentage: 100,
        hoursUntil,
        originalAmount,
        refundAmount: amount,
        emergencyRefund: true,
        overrideAmount,
        ruleApplied: 'EMERGENCY_REFUND',
      }),
    };
  }

  // Full refund
  if (hoursUntil >= policy.fullRefundHours) {
    const refundAmount = overrideAmount !== null ? overrideAmount : originalAmount;
    const amount = Math.max(0, refundAmount - processingFee);
    return {
      eligible: true,
      refundAmount: amount,
      originalAmount,
      reason: `Full refund - ${hoursUntil} hours before event`,
      policy,
      ruleApplied: 'FULL_REFUND',
      breakdown: {
        originalAmount,
        refundAmount: refundAmount,
        processingFee,
        finalAmount: amount,
        ruleApplied: 'FULL_REFUND',
      },
      message: buildRefundMessage({
        percentage: 100,
        hoursUntil,
        originalAmount,
        refundAmount: amount,
        emergencyRefund: false,
        overrideAmount,
        ruleApplied: 'FULL_REFUND',
      }),
    };
  }

  // Partial refund
  if (policy.partialRefundHours && hoursUntil >= policy.partialRefundHours) {
    const percent = policy.partialRefundPercent || 50;
    const amountBeforeFee = overrideAmount !== null ? overrideAmount : Math.round((originalAmount * percent) / 100);
    const amount = Math.max(0, amountBeforeFee - processingFee);
    return {
      eligible: true,
      refundAmount: amount,
      originalAmount,
      reason: `Partial refund (${percent}%) - ${hoursUntil} hours before event`,
      policy,
      ruleApplied: 'PARTIAL_REFUND',
      breakdown: {
        originalAmount,
        refundAmount: amountBeforeFee,
        processingFee,
        finalAmount: amount,
        ruleApplied: 'PARTIAL_REFUND',
      },
      message: buildRefundMessage({
        percentage: percent,
        hoursUntil,
        originalAmount,
        refundAmount: amount,
        emergencyRefund: false,
        overrideAmount,
        ruleApplied: 'PARTIAL_REFUND',
      }),
    };
  }

  return {
    eligible: false,
    refundAmount: 0,
    originalAmount,
    reason: 'No refund - within partial refund window',
    policy,
    ruleApplied: 'NO_REFUND',
    breakdown: {
      originalAmount,
      refundAmount: 0,
      processingFee,
      finalAmount: 0,
      ruleApplied: 'NO_REFUND',
    },
    message: 'Refund not allowed because the appointment is too close to the scheduled time.',
  };
}

/**
 * Calculate refund eligibility and amount based on organization policy and booking.
 * Returns an extended breakdown that can be shown directly in the UI.
 */
async function calculateRefundEligibility(booking, options = {}) {
  if (!booking) throw new Error('Booking required');

  // Booking may store `amountPaid` or `totalAmount` depending on data model
  const originalAmount = booking.amountPaid || booking.totalAmount || 0;

  // Find organization's refund policy
  const orgId = booking.organizationId || (booking.appointment && booking.appointment.organizationId) || booking.organizationId;
  let policy = await prisma.refundPolicy.findUnique({ where: { organizationId: orgId } });

  if (!policy) {
    // Return a default policy if none is configured
    policy = {
      ...DEFAULT_POLICY,
      organizationId: orgId,
    };
  }

  return calculateWithPolicy(booking, policy, originalAmount, options);
}

module.exports = { calculateRefundEligibility };
