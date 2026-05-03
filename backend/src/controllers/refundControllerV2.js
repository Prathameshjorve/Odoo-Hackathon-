const prisma = require('../lib/prisma');
const { refundService } = require('../services/refundService');
const { calculateRefundEligibility } = require('../services/refundEligibilityService');
const { RefundError } = require('../services/refunds/refundError');

const ADMIN_EMAILS = new Set([
  'aryan@devally.in',
  'prathameshjorve09@gmail.com',
  'admin@bookfastx.com',
]);

function isSuperAdmin(user) {
  return Boolean(user?.email && ADMIN_EMAILS.has(String(user.email).toLowerCase()));
}

function isOrganizationAdmin(user) {
  return Boolean(user && user.role === 'ORGANIZATION');
}

function canManageOrganizationRefunds(user, organizationId) {
  if (!user) {
    return false;
  }

  if (isSuperAdmin(user)) {
    return true;
  }

  return isOrganizationAdmin(user) && String(user.organizationId || '') === String(organizationId || '');
}

function getRequestMetadata(req) {
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent'] || '',
    userId: req.user?.id || null,
    role: req.user?.role || null,
    currentTime: req.body.currentTime ? new Date(req.body.currentTime) : new Date(),
    reasonDetails: req.body.reasonDetails || req.body.note || null,
    metadata: req.body.metadata || {
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
    },
  };
}

function serializeRefund(refund) {
  if (!refund) {
    return refund;
  }

  const timeline = Array.isArray(refund.timeline) && refund.timeline.length > 0
    ? refund.timeline
    : [
        { step: 'REQUESTED', time: refund.requestedAt || refund.createdAt },
        refund.approvedAt ? { step: 'APPROVED', time: refund.approvedAt } : null,
        refund.processedAt ? { step: 'PROCESSING', time: refund.processedAt } : null,
        refund.completedAt ? { step: 'COMPLETED', time: refund.completedAt } : null,
        refund.failedAt ? { step: 'FAILED', time: refund.failedAt } : null,
      ].filter(Boolean);

  return {
    ...refund,
    timeline,
    statusHistory: Array.isArray(refund.statusHistory) ? refund.statusHistory : [],
  };
}

function handleRefundError(res, error) {
  if (error instanceof RefundError) {
    const statusMap = {
      REFUND_NOT_FOUND: 404,
      BOOKING_NOT_FOUND: 404,
      DUPLICATE_REFUND: 409,
      REFUND_LOCKED: 409,
      NOT_AUTHORIZED: 403,
      PAYMENT_NOT_PAID: 400,
      EVENT_STARTED: 400,
      POLICY_NOT_CONFIGURED: 422,
      NO_REFUND: 422,
      INVALID_STATE: 409,
      MISSING_PAYMENT_ID: 422,
      NOT_YOUR_BOOKING: 403,
      INVALID_REFUND_TRANSITION: 409,
    };

    return res.status(statusMap[error.code] || 400).json({
      success: false,
      message: error.message,
      code: error.code,
      metadata: error.metadata || {},
    });
  }

  console.error('Refund controller error:', error);
  return res.status(500).json({ success: false, message: 'Internal server error' });
}

async function getRefundPolicy(req, res) {
  try {
    const organizationId = req.user.organizationId;
    if (!organizationId) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const policy = await prisma.refundPolicy.findUnique({ where: { organizationId } });
    return res.json({ success: true, data: policy || null });
  } catch (error) {
    return handleRefundError(res, error);
  }
}

async function updateRefundPolicy(req, res) {
  try {
    if (!isOrganizationAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const organizationId = req.user.organizationId;
    if (!organizationId) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const policy = await prisma.refundPolicy.upsert({
      where: { organizationId },
      update: {
        rules: req.body.rules || [],
        specialRules: req.body.specialRules || null,
        globalProcessingFee: Number(req.body.globalProcessingFee || req.body.processingFee || 0),
        requiresApproval: req.body.requiresApproval !== undefined ? Boolean(req.body.requiresApproval) : true,
        autoProcessAbove: req.body.autoProcessAbove !== undefined ? Number(req.body.autoProcessAbove) : null,
        allowAutoApproval: req.body.allowAutoApproval !== undefined ? Boolean(req.body.allowAutoApproval) : true,
        maxRefundRequestsPerBooking: Number(req.body.maxRefundRequestsPerBooking || 3),
        maxRefundRequestsPerUserPerMonth: Number(req.body.maxRefundRequestsPerUserPerMonth || 10),
        allowWalletCredits: req.body.allowWalletCredits !== undefined ? Boolean(req.body.allowWalletCredits) : false,
        version: req.body.version !== undefined ? Number(req.body.version) : undefined,
        fullRefundHours: Number(req.body.fullRefundHours || 48),
        partialRefundHours: req.body.partialRefundHours !== undefined ? Number(req.body.partialRefundHours) : null,
        partialRefundPercent: Number(req.body.partialRefundPercent || 50),
        processingFee: Number(req.body.processingFee || 0),
      },
      create: {
        organizationId,
        rules: req.body.rules || [],
        specialRules: req.body.specialRules || null,
        globalProcessingFee: Number(req.body.globalProcessingFee || req.body.processingFee || 0),
        requiresApproval: req.body.requiresApproval !== undefined ? Boolean(req.body.requiresApproval) : true,
        autoProcessAbove: req.body.autoProcessAbove !== undefined ? Number(req.body.autoProcessAbove) : null,
        allowAutoApproval: req.body.allowAutoApproval !== undefined ? Boolean(req.body.allowAutoApproval) : true,
        maxRefundRequestsPerBooking: Number(req.body.maxRefundRequestsPerBooking || 3),
        maxRefundRequestsPerUserPerMonth: Number(req.body.maxRefundRequestsPerUserPerMonth || 10),
        allowWalletCredits: req.body.allowWalletCredits !== undefined ? Boolean(req.body.allowWalletCredits) : false,
        version: req.body.version !== undefined ? Number(req.body.version) : 1,
        fullRefundHours: Number(req.body.fullRefundHours || 48),
        partialRefundHours: req.body.partialRefundHours !== undefined ? Number(req.body.partialRefundHours) : null,
        partialRefundPercent: Number(req.body.partialRefundPercent || 50),
        processingFee: Number(req.body.processingFee || 0),
      },
    });

    return res.json({ success: true, data: policy });
  } catch (error) {
    return handleRefundError(res, error);
  }
}

async function requestRefund(req, res) {
  try {
    const bookingId = req.params.bookingId;
    const refund = await refundService.requestRefund(bookingId, req.user.id, req.body.reason || 'CUSTOMER_REQUEST', {
      ...getRequestMetadata(req),
      overrideAmount: req.body.overrideAmount,
      emergencyRefund: Boolean(req.body.emergencyRefund),
    });
    return res.status(200).json({ success: true, message: 'Refund request submitted successfully', data: serializeRefund(refund) });
  } catch (error) {
    return handleRefundError(res, error);
  }
}

async function getRefundStatus(req, res) {
  try {
    const refund = await prisma.refundTransaction.findFirst({
      where: { bookingId: req.params.bookingId },
      include: { booking: { include: { appointment: { include: { organization: true } }, user: true } } },
    });

    if (!refund) {
      return res.status(404).json({ success: false, message: 'Refund not found' });
    }

    const isOwner = refund.booking.userId === req.user.id;
    const isOrgManager = canManageOrganizationRefunds(req.user, refund.booking.appointment?.organizationId);
    if (!isOwner && !isOrgManager) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    return res.json({ success: true, data: serializeRefund(refund) });
  } catch (error) {
    return handleRefundError(res, error);
  }
}

async function cancelRefund(req, res) {
  try {
    const refund = await refundService.cancelRefund(req.params.refundId, req.user.id);
    return res.json({ success: true, data: serializeRefund(refund) });
  } catch (error) {
    return handleRefundError(res, error);
  }
}

async function listRefunds(req, res) {
  try {
    if (!isOrganizationAdmin(req.user) && !isSuperAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const organizationId = isSuperAdmin(req.user) ? req.query.organizationId || req.user.organizationId : req.user.organizationId;
    const refunds = await refundService.listRefunds({
      organizationId,
      status: req.query.status || undefined,
      bookingId: req.query.bookingId || undefined,
    });

    return res.json({ success: true, data: refunds });
  } catch (error) {
    return handleRefundError(res, error);
  }
}

async function getRefundDetails(req, res) {
  try {
    const refund = await refundService.getRefundStatus(req.params.refundId);
    if (!refund) {
      return res.status(404).json({ success: false, message: 'Refund not found' });
    }

    if (!canManageOrganizationRefunds(req.user, refund.booking.appointment?.organizationId) && refund.booking.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    return res.json({ success: true, data: serializeRefund(refund) });
  } catch (error) {
    return handleRefundError(res, error);
  }
}

async function approveRefund(req, res) {
  try {
    if (!canManageOrganizationRefunds(req.user, req.body.organizationId || req.params.organizationId || req.user.organizationId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const refund = await refundService.approveRefund(req.params.refundId, req.user.id, req.body.note || 'Approved by admin', {
      overrideAmount: req.body.overrideAmount,
      emergencyRefund: Boolean(req.body.emergencyRefund),
    });
    return res.json({ success: true, data: serializeRefund(refund) });
  } catch (error) {
    return handleRefundError(res, error);
  }
}

async function rejectRefund(req, res) {
  try {
    if (!canManageOrganizationRefunds(req.user, req.body.organizationId || req.params.organizationId || req.user.organizationId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const refund = await refundService.rejectRefund(req.params.refundId, req.user.id, req.body.note || 'Rejected by admin');
    return res.json({ success: true, data: serializeRefund(refund) });
  } catch (error) {
    return handleRefundError(res, error);
  }
}

async function processRefundByAdmin(req, res) {
  try {
    const refund = await refundService.getRefundStatus(req.params.refundId);
    if (!refund) {
      return res.status(404).json({ success: false, message: 'Refund not found' });
    }

    if (!canManageOrganizationRefunds(req.user, refund.booking.appointment?.organizationId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (refund.status === 'PENDING') {
      await refundService.approveRefund(refund.id, req.user.id, req.body.overrideReason || 'Auto-approved for processing', {
        overrideAmount: req.body.overrideAmount,
        emergencyRefund: Boolean(req.body.emergencyRefund),
      });
    }

    const result = await refundService.processRefund(refund.id, req.user.id);
    return res.json({ success: true, data: serializeRefund(result) });
  } catch (error) {
    return handleRefundError(res, error);
  }
}

async function getRefundMetrics(req, res) {
  try {
    if (!isOrganizationAdmin(req.user) && !isSuperAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const metrics = await refundService.getDashboardMetrics(isSuperAdmin(req.user) ? (req.query.organizationId || req.user.organizationId || null) : req.user.organizationId);
    return res.json({ success: true, data: metrics });
  } catch (error) {
    return handleRefundError(res, error);
  }
}

async function testRefundPolicy(req, res) {
  try {
    const booking = req.body.booking;
    const policy = req.body.policy;
    if (!booking || !policy) {
      return res.status(400).json({ success: false, message: 'booking and policy are required' });
    }

    const result = await refundService.testPolicy(booking, policy, req.body.currentTime ? new Date(req.body.currentTime) : new Date());
    return res.json({ success: true, data: result });
  } catch (error) {
    return handleRefundError(res, error);
  }
}

async function getFailedRefunds(req, res) {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const data = await refundService.getFailedRefunds();
    return res.json({ success: true, data });
  } catch (error) {
    return handleRefundError(res, error);
  }
}

async function manualRetry(req, res) {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const result = await refundService.retryRefund(req.params.refundId, req.user.id);
    return res.json({ success: true, data: serializeRefund(result) });
  } catch (error) {
    return handleRefundError(res, error);
  }
}

async function manualReconcile(req, res) {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const refund = await prisma.refundTransaction.findUnique({ where: { id: req.params.refundId }, include: { booking: true } });
    if (!refund) {
      return res.status(404).json({ success: false, message: 'Refund not found' });
    }

    const updated = await prisma.refundTransaction.update({
      where: { id: refund.id },
      data: {
        status: 'COMPLETED',
        processedBy: req.user.id,
        processedAt: new Date(),
        completedAt: new Date(),
        lastError: null,
        statusHistory: Array.isArray(refund.statusHistory)
          ? [...refund.statusHistory, { status: 'COMPLETED', timestamp: new Date().toISOString(), note: 'Manual reconciliation', operator: req.user.id }]
          : [{ status: 'COMPLETED', timestamp: new Date().toISOString(), note: 'Manual reconciliation', operator: req.user.id }],
      },
    });

    await prisma.booking.update({ where: { id: refund.bookingId }, data: { paymentStatus: 'REFUNDED' } });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return handleRefundError(res, error);
  }
}

async function getRefundEligibility(req, res) {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId }, include: { appointment: { include: { organization: true } }, user: true } });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const result = await calculateRefundEligibility(booking, {
      currentTime: req.query.currentTime ? new Date(req.query.currentTime) : new Date(),
      overrideAmount: req.query.overrideAmount !== undefined ? Number(req.query.overrideAmount) : undefined,
      emergencyRefund: req.query.emergencyRefund === 'true',
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    return handleRefundError(res, error);
  }
}

module.exports = {
  getRefundPolicy,
  updateRefundPolicy,
  requestRefund,
  getRefundStatus,
  cancelRefund,
  listRefunds,
  getRefundDetails,
  approveRefund,
  rejectRefund,
  processRefundByAdmin,
  getRefundMetrics,
  testRefundPolicy,
  getFailedRefunds,
  manualRetry,
  manualReconcile,
  getRefundEligibility,
};
