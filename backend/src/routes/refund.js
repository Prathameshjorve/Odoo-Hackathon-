const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/requireAuth');
const { refundGuard } = require('../middlewares/refundGuard');
const {
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
} = require('../controllers/refundControllerV2');

router.post('/bookings/:bookingId/refunds', requireAuth, refundGuard.rateLimit, refundGuard.checkEligibility, requestRefund);
router.get('/bookings/:bookingId/refunds', requireAuth, getRefundStatus);
router.delete('/refunds/:refundId', requireAuth, cancelRefund);

router.get('/organization/refunds', requireAuth, listRefunds);
router.get('/organization/refunds/metrics', requireAuth, getRefundMetrics);
router.get('/organization/refunds/:refundId', requireAuth, getRefundDetails);
router.put('/organization/refunds/:refundId/approve', requireAuth, approveRefund);
router.put('/organization/refunds/:refundId/reject', requireAuth, rejectRefund);
router.post('/organization/refunds/:refundId/process', requireAuth, processRefundByAdmin);

router.get('/organization/refund-policy', requireAuth, getRefundPolicy);
router.put('/organization/refund-policy', requireAuth, updateRefundPolicy);
router.post('/organization/refund-policy/test', requireAuth, testRefundPolicy);

router.get('/bookings/refund-eligibility/:bookingId', requireAuth, getRefundEligibility);

router.get('/admin/refunds/failed', requireAuth, getFailedRefunds);
router.post('/admin/refunds/:refundId/retry', requireAuth, manualRetry);
router.put('/admin/refunds/:refundId/manual', requireAuth, manualReconcile);

module.exports = router;
