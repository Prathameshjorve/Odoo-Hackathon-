const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { getSharedRedisClient, withRedis } = require('../lib/redisClient');
const { calculateRefundEligibility } = require('./refundEligibilityService');
const { RefundRepository } = require('./refunds/refundRepository');
const { RefundCalculatorFactory } = require('./refunds/refundCalculators');
const { RefundStateMachine } = require('./refunds/refundStateMachine');
const { RefundError, DuplicateRefundError, IneligibleRefundError } = require('./refunds/refundError');
const { refundEventBus } = require('./refunds/refundEventBus');
const { RazorpayRefundClient } = require('./razorpayRefundClient');
const { createRefundQueue, registerRefundProcessor } = require('../workers/refundQueue');
const { auditLogService } = require('./refunds/auditLogService');

class RefundService {
  constructor({
    repository = new RefundRepository(prisma),
    calculatorFactory = RefundCalculatorFactory,
    stateMachine = new RefundStateMachine(),
    eventBus = refundEventBus,
    refundClient = null,
    queue = null,
    logger = console,
    redisClient = null,
  } = {}) {
    this.repository = repository;
    this.calculatorFactory = calculatorFactory;
    this.stateMachine = stateMachine;
    this.eventBus = eventBus;
    this.logger = logger;
    this.redisClient = redisClient;
    this.refundClient = refundClient || new RazorpayRefundClient({ redisClient, logger });
    this.queue = queue || createRefundQueue();
    if (this.queue) {
      registerRefundProcessor(this.queue, this).catch((error) => {
        this.logger.warn?.('Refund queue processor registration failed', error.message);
      });
    }

    this.bindObservers();
  }

  bindObservers() {
    if (this._observersBound) {
      return;
    }

    this.eventBus.on('refund.requested', async (payload) => {
      await this.repository.createRefundEvent({
        refundTransactionId: payload.refundTransactionId,
        eventType: 'REFUND_REQUESTED',
        payload,
        checksum: this.createChecksum(payload),
      }).catch(() => null);
    });

    this.eventBus.on('refund.approved', async (payload) => {
      await this.repository.createRefundEvent({
        refundTransactionId: payload.refundTransactionId,
        eventType: 'REFUND_APPROVED',
        payload,
        checksum: this.createChecksum(payload),
      }).catch(() => null);
    });

    this.eventBus.on('refund.completed', async (payload) => {
      await this.repository.createRefundEvent({
        refundTransactionId: payload.refundTransactionId,
        eventType: 'REFUND_COMPLETED',
        payload,
        checksum: this.createChecksum(payload),
      }).catch(() => null);
    });

    this.eventBus.on('refund.failed', async (payload) => {
      await this.repository.createRefundEvent({
        refundTransactionId: payload.refundTransactionId,
        eventType: 'REFUND_FAILED',
        payload,
        checksum: this.createChecksum(payload),
      }).catch(() => null);
    });

    this.eventBus.on('refund.webhook.received', async (payload) => {
      await this.repository.createWebhookEvent({
        eventId: payload.eventId,
        eventType: payload.eventType,
        payload,
        signature: payload.signature || null,
        status: 'PROCESSING',
      }).catch(async (error) => {
        if (String(error.code || '').includes('P2002')) {
          await this.repository.updateWebhookEvent(payload.eventId, {
            status: 'COMPLETED',
            processedAt: new Date(),
          }).catch(() => null);
        }
      });
    });

    this._observersBound = true;
  }

  createChecksum(payload) {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  createHistory(transaction, status, note, operator) {
    const history = Array.isArray(transaction.statusHistory) ? transaction.statusHistory : [];
    return this.stateMachine.appendHistory(history, status, note, operator);
  }

  buildTimeline(refund) {
    const timeline = [
      { step: 'REQUESTED', time: refund.requestedAt || refund.createdAt || new Date().toISOString() },
    ];

    if (refund.approvedAt) {
      timeline.push({ step: 'APPROVED', time: refund.approvedAt });
    }

    if (refund.processedAt) {
      timeline.push({ step: 'PROCESSING', time: refund.processedAt });
    }

    if (refund.completedAt) {
      timeline.push({ step: 'COMPLETED', time: refund.completedAt });
    }

    if (refund.failedAt) {
      timeline.push({ step: 'FAILED', time: refund.failedAt });
    }

    return timeline;
  }

  async recordAudit(refundTransactionId, action, metadata = {}, tx = null) {
    return auditLogService.logAction({
      refundTransactionId,
      action,
      userId: metadata.userId || null,
      role: metadata.role || null,
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null,
      metadata: metadata.metadata || null,
    }, tx || this.repository.db || prisma).catch(() => null);
  }

  calculateRefundAmount(booking, policy, currentTime = new Date()) {
    const calculator = this.calculatorFactory.getCalculator(booking.refundType || policy?.refundType || booking.type || 'FULL');
    return calculator.calculate(booking, policy, currentTime);
  }

  async requestRefund(bookingId, userId, reason, metadata = {}) {
    const lockKey = `refund:lock:${bookingId}`;
    const lock = await this.repository.acquireLock(lockKey, 30);
    if (!lock) {
      throw new DuplicateRefundError('Refund already in progress', 'REFUND_LOCKED', { bookingId });
    }

    try {
      const booking = await this.repository.findBookingById(bookingId);
      if (!booking) {
        throw new IneligibleRefundError('Booking not found', 'BOOKING_NOT_FOUND', { bookingId });
      }

      if (booking.userId !== userId) {
        throw new IneligibleRefundError('Not your booking', 'NOT_AUTHORIZED', { bookingId, userId });
      }

      if (booking.paymentStatus !== 'PAID') {
        throw new IneligibleRefundError('Booking payment is not refundable', 'PAYMENT_NOT_PAID', { bookingId, paymentStatus: booking.paymentStatus });
      }

      if (new Date(booking.startTime) <= new Date()) {
        throw new IneligibleRefundError('Event already started', 'EVENT_STARTED', { bookingId });
      }

      const existing = await this.repository.findRefundByBookingId(bookingId);
      if (existing) {
        throw new DuplicateRefundError('Refund already exists', 'DUPLICATE_REFUND', { bookingId, refundId: existing.id });
      }

      const organizationId = booking.appointment?.organizationId;
      const policy = await this.repository.findPolicyByOrganizationId(organizationId);
      if (!policy) {
        throw new IneligibleRefundError('Refund policy not configured', 'POLICY_NOT_CONFIGURED', { organizationId });
      }

      const db = this.repository.db || prisma;
      const userMonthlyCount = await db.refundTransaction.count({
        where: {
          requestedBy: userId,
          requestedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      });
      if (Number(policy.maxRefundRequestsPerUserPerMonth || 10) > 0 && userMonthlyCount >= Number(policy.maxRefundRequestsPerUserPerMonth || 10)) {
        throw new IneligibleRefundError('You have exceeded refund limit for this month', 'REFUND_LIMIT_EXCEEDED', { userId, limit: policy.maxRefundRequestsPerUserPerMonth });
      }

      const calculation = await calculateRefundEligibility(booking, {
        currentTime: metadata.currentTime || new Date(),
        overrideAmount: metadata.overrideAmount,
        emergencyRefund: Boolean(metadata.emergencyRefund),
      });

      if (!calculation || Number(calculation.refundAmount) <= 0) {
        throw new IneligibleRefundError('No refundable amount under policy', 'NO_REFUND', { bookingId });
      }

      const autoApprove = Boolean(policy.allowAutoApproval) && (!policy.requiresApproval || (Number(policy.autoProcessAbove || 0) > 0 && Number(calculation.refundAmount) <= Number(policy.autoProcessAbove)));
      const status = autoApprove ? 'APPROVED' : 'PENDING';
      const idempotencyKey = metadata.idempotencyKey || `refund_${bookingId}_${crypto.randomBytes(8).toString('hex')}`;
      const statusHistory = this.createHistory({ statusHistory: [] }, status, 'Refund requested', 'system');

      const transaction = await db.$transaction(async (tx) => {
        const created = await this.repository.createRefundTransaction({
          bookingId,
          originalAmount: calculation.originalAmount,
          refundAmount: calculation.refundAmount,
          processingFee: calculation.processingFee || 0,
          gatewayFee: 0,
          netAmount: Math.max(0, Number(calculation.refundAmount) - Number(calculation.processingFee || 0)),
          razorpayPaymentId: booking.razorpayPaymentId || metadata.razorpayPaymentId || null,
          status,
          statusHistory,
          refundReason: reason || 'CUSTOMER_REQUEST',
          reasonDetails: metadata.reasonDetails || null,
          refundType: calculation.refundType || 'FULL',
          refundBreakdown: calculation.breakdown || null,
          eligibilityMessage: calculation.message || calculation.reason || null,
          ruleApplied: calculation.ruleApplied || calculation.breakdown?.ruleApplied || null,
          requestedBy: userId,
          requestedByRole: metadata.role || null,
          metadata,
          idempotencyKey,
          retryCount: 0,
          attempts: 0,
          amount: calculation.refundAmount,
          reason: reason || 'CUSTOMER_REQUEST',
          emergencyRefund: Boolean(metadata.emergencyRefund),
          overrideAmount: metadata.overrideAmount !== undefined ? Number(metadata.overrideAmount) : null,
          timeline: [{ step: 'REQUESTED', time: new Date().toISOString() }],
        }, tx);

        await this.repository.createRefundEvent({
          refundTransactionId: created.id,
          eventType: 'REFUND_REQUESTED',
          payload: { bookingId, userId, amount: calculation.refundAmount, reason, metadata },
          checksum: this.createChecksum({ bookingId, userId, amount: calculation.refundAmount, reason, metadata }),
        }, tx);

        return created;
      });

      this.eventBus.emitRefundRequested({ refundTransactionId: transaction.id, bookingId, userId, amount: transaction.refundAmount || transaction.amount, status });
      await this.recordAudit(transaction.id, 'REQUESTED', { userId, role: metadata.role || 'USER', ipAddress: metadata.ip, userAgent: metadata.userAgent, metadata }, db);

      if (status === 'APPROVED' || process.env.ENABLE_AUTO_REFUND === 'true') {
        await this.enqueueRefundProcessing(transaction.id, metadata.adminId || null);
      }

      return transaction;
    } finally {
      await this.repository.releaseLock(lockKey);
    }
  }

  async approveRefund(refundId, adminId, note = '', options = {}) {
    const refund = await this.repository.findRefundById(refundId);
    if (!refund) {
      throw new RefundError('Refund not found', 'REFUND_NOT_FOUND', { refundId });
    }

    const next = this.stateMachine.transition(refund.status, 'APPROVED', { adminId, note });
    const updated = await this.repository.updateRefundTransaction(refundId, {
      status: next.status,
      approvedBy: adminId,
      approvedAt: new Date(),
      overrideAmount: options.overrideAmount !== undefined ? Number(options.overrideAmount) : refund.overrideAmount,
      emergencyRefund: options.emergencyRefund !== undefined ? Boolean(options.emergencyRefund) : Boolean(refund.emergencyRefund),
      statusHistory: this.stateMachine.appendHistory(refund.statusHistory, 'APPROVED', note, adminId || 'admin'),
    });

    await this.recordAudit(refundId, 'APPROVED', { userId: adminId, role: 'ADMIN', metadata: { note } });

    this.eventBus.emitRefundApproved({ refundTransactionId: refundId, adminId, note });
    return updated;
  }

  async rejectRefund(refundId, adminId, note = '') {
    const refund = await this.repository.findRefundById(refundId);
    if (!refund) {
      throw new RefundError('Refund not found', 'REFUND_NOT_FOUND', { refundId });
    }

    const updated = await this.repository.updateRefundTransaction(refundId, {
      status: 'REJECTED',
      approvedBy: adminId,
      approvedAt: new Date(),
      reasonDetails: note || refund.reasonDetails,
      statusHistory: this.stateMachine.appendHistory(refund.statusHistory, 'REJECTED', note, adminId || 'admin'),
    });

    this.eventBus.emitRefundFailed({ refundTransactionId: refundId, adminId, note, rejected: true });
    await this.recordAudit(refundId, 'FAILED', { userId: adminId, role: 'ADMIN', metadata: { note, rejected: true } });
    return updated;
  }

  async cancelRefund(refundId, userId) {
    const refund = await this.repository.findRefundById(refundId);
    if (!refund) {
      throw new RefundError('Refund not found', 'REFUND_NOT_FOUND', { refundId });
    }

    if (refund.requestedBy && refund.requestedBy !== userId) {
      throw new RefundError('Not authorized to cancel this refund', 'NOT_AUTHORIZED', { refundId, userId });
    }

    const updated = await this.repository.updateRefundTransaction(refundId, {
      status: 'CANCELLED',
      statusHistory: this.stateMachine.appendHistory(refund.statusHistory, 'CANCELLED', 'Cancelled by user', userId || 'user'),
    });

    return updated;
  }

  async enqueueRefundProcessing(refundId, adminId = null) {
    if (!this.queue) {
      return this.processRefund(refundId, adminId);
    }

    await this.queue.add('process-refund', { refundId, adminId }, {
      jobId: `refund:${refundId}`,
      removeOnComplete: true,
      removeOnFail: false,
      attempts: Number(process.env.REFUND_MAX_RETRIES || 3),
      backoff: { type: 'exponential', delay: 1000 },
    });

    return { queued: true, refundId };
  }

  async processRefund(refundId, adminId = null) {
    const db = this.repository.db || prisma;
    const processed = await db.$transaction(async (tx) => {
      const refund = await this.repository.lockRefundTransaction(refundId, tx);
      if (!refund) {
        throw new RefundError('Refund not found', 'REFUND_NOT_FOUND', { refundId });
      }

      if (refund.status === 'COMPLETED') {
        return refund;
      }

      if (!['APPROVED', 'PROCESSING', 'PENDING'].includes(refund.status)) {
        throw new RefundError(`Refund is not processable from state ${refund.status}`, 'INVALID_STATE', { refundId, status: refund.status });
      }

      const booking = await this.repository.findBookingById(refund.bookingId, tx);
      if (!booking) {
        throw new RefundError('Booking not found', 'BOOKING_NOT_FOUND', { refundId, bookingId: refund.bookingId });
      }

      const paymentId = refund.razorpayPaymentId || booking.razorpayPaymentId;
      if (!paymentId) {
        throw new RefundError('Missing Razorpay payment id', 'MISSING_PAYMENT_ID', { refundId, bookingId: booking.id });
      }

      const connectedAccountId = booking.appointment?.organizationId
        ? await tx.organizationRazorpayConnection.findUnique({ where: { organizationId: booking.appointment.organizationId } }).then((entry) => entry?.razorpayMerchantId || null).catch(() => null)
        : null;

      const nextStatus = this.stateMachine.transition(refund.status, 'PROCESSING', { adminId, note: 'Submitting to Razorpay' });
      await this.repository.updateRefundTransaction(refund.id, {
        status: nextStatus.status,
        processedBy: adminId || 'system',
        processedAt: new Date(),
        statusHistory: this.stateMachine.appendHistory(refund.statusHistory, 'PROCESSING', 'Submitting to Razorpay', adminId || 'system'),
      }, tx);

      const refundAmount = Number(refund.overrideAmount || refund.refundAmount || refund.amount || 0);
      const razorpayResponse = await this.refundClient.createRefund(paymentId, refundAmount, {
        idempotencyKey: refund.idempotencyKey || `refund_${refund.id}`,
        bookingId: booking.id,
        reason: refund.reason || refund.refundReason || 'CUSTOMER_REQUEST',
        initiatedBy: adminId || refund.requestedBy || 'system',
        connectedAccountId,
      });

      const completed = await this.repository.updateRefundTransaction(refund.id, {
        status: 'COMPLETED',
        razorpayRefundId: razorpayResponse.id,
        approvedBy: refund.approvedBy || adminId || null,
        completedAt: new Date(),
        retryCount: refund.retryCount,
        lastError: null,
        netAmount: Number(refund.netAmount || 0),
        refundAmount,
        timeline: this.buildTimeline({ ...refund, processedAt: new Date(), completedAt: new Date(), approvedAt: refund.approvedAt || new Date() }),
        statusHistory: this.stateMachine.appendHistory(refund.statusHistory, 'COMPLETED', 'Refund completed', adminId || 'system'),
      }, tx);

      await tx.booking.update({ where: { id: booking.id }, data: { paymentStatus: 'REFUNDED' } });

      await this.repository.createRefundEvent({
        refundTransactionId: refund.id,
        eventType: 'REFUND_COMPLETED',
        payload: { refundId: refund.id, bookingId: booking.id, razorpayRefundId: razorpayResponse.id },
        checksum: this.createChecksum({ refundId: refund.id, bookingId: booking.id, razorpayRefundId: razorpayResponse.id }),
      }, tx);

      this.eventBus.emitRefundCompleted({ refundTransactionId: refund.id, bookingId: booking.id, razorpayRefundId: razorpayResponse.id });
      await this.recordAudit(refund.id, 'PROCESSED', { userId: adminId, role: adminId ? 'ADMIN' : 'SYSTEM', metadata: { bookingId: booking.id, razorpayRefundId: razorpayResponse.id } }, tx);
      return completed;
    });

    return processed;
  }

  async handleRefundFailure(refundId, error, retryCount = 1) {
    const refund = await this.repository.findRefundById(refundId);
    if (!refund) {
      return null;
    }

    const nextRetryCount = Number(retryCount || refund.retryCount || 0);
    const shouldRetry = nextRetryCount < Number(process.env.REFUND_MAX_RETRIES || 3);
    const nextStatus = shouldRetry ? 'PROCESSING' : 'REQUIRES_MANUAL';

    const updated = await this.repository.updateRefundTransaction(refundId, {
      status: nextStatus,
      retryCount: nextRetryCount,
      lastError: error?.message || String(error),
      failedAt: shouldRetry ? null : new Date(),
      timeline: this.buildTimeline({ ...refund, status: nextStatus, failedAt: shouldRetry ? null : new Date() }),
      statusHistory: this.stateMachine.appendHistory(refund.statusHistory, nextStatus, error?.message || String(error), 'system'),
    });

    if (this.queue && shouldRetry) {
      const delay = this.computeRetryDelay(nextRetryCount);
      await this.queue.add('process-refund', { refundId }, { delay, jobId: `refund:${refundId}:retry:${nextRetryCount}` });
    }

    this.eventBus.emitRefundFailed({ refundTransactionId: refundId, error: error?.message || String(error), retryCount: nextRetryCount, shouldRetry });
    await this.recordAudit(refundId, 'FAILED', { role: 'SYSTEM', metadata: { error: error?.message || String(error), retryCount: nextRetryCount, shouldRetry } });
    return updated;
  }

  computeRetryDelay(attemptNumber) {
    const delays = String(process.env.REFUND_RETRY_DELAYS || '1000,5000,15000')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);
    return delays[Math.min(attemptNumber - 1, delays.length - 1)] || 1000;
  }

  async getRefundStatus(refundId) {
    const refund = await this.repository.findRefundById(refundId);
    if (!refund) return null;
    return { ...refund, timeline: refund.timeline || this.buildTimeline(refund) };
  }

  async listRefunds(filters = {}) {
    return this.repository.listRefunds(filters);
  }

  async getFailedRefunds() {
    return this.repository.listFailedRefunds();
  }

  async getDashboardMetrics(organizationId = null) {
    const metrics = await this.repository.metrics(organizationId);
    const refunds = await this.repository.listRefunds(organizationId ? { organizationId } : {});

    const daily = refunds.reduce((accumulator, refund) => {
      const date = new Date(refund.createdAt).toISOString().slice(0, 10);
      accumulator[date] = accumulator[date] || { date, count: 0, amount: 0 };
      accumulator[date].count += 1;
      accumulator[date].amount += Number(refund.refundAmount || refund.amount || 0);
      return accumulator;
    }, {});

    const hourly = refunds.reduce((accumulator, refund) => {
      const hour = new Date(refund.createdAt).getHours();
      accumulator[hour] = (accumulator[hour] || 0) + 1;
      return accumulator;
    }, {});

    const peakCancellationHours = Object.entries(hourly)
      .sort((left, right) => Number(right[1]) - Number(left[1]))
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: Number(hour), count }));

    const revenueLostDueToRefunds = refunds.reduce((sum, refund) => sum + Number(refund.refundAmount || refund.amount || 0), 0);

    return {
      metrics: {
        ...metrics,
        averageProcessingTime: '0h',
        refundRate: refunds.length ? Number(((metrics.totalRefundCount / refunds.length) * 100).toFixed(2)) : 0,
        revenueLostDueToRefunds,
      },
      trends: {
        daily: Object.values(daily),
        weekly: [],
        peakCancellationHours,
      },
    };
  }

  async retryRefund(refundId, adminId = null) {
    const refund = await this.repository.findRefundById(refundId);
    if (!refund) {
      throw new RefundError('Refund not found', 'REFUND_NOT_FOUND', { refundId });
    }

    if (!['FAILED', 'REQUIRES_MANUAL'].includes(refund.status)) {
      throw new RefundError('Refund is not eligible for retry', 'INVALID_STATE', { refundId, status: refund.status });
    }

    const updated = await this.repository.updateRefundTransaction(refundId, {
      status: 'PROCESSING',
      lastError: null,
      retryCount: (refund.retryCount || 0) + 1,
      statusHistory: this.stateMachine.appendHistory(refund.statusHistory, 'PROCESSING', 'Manual retry queued', adminId || 'system'),
    });

    await this.recordAudit(refundId, 'OVERRIDE', { userId: adminId, role: 'ADMIN', metadata: { action: 'retry' } });

    await this.enqueueRefundProcessing(refundId, adminId);
    return updated;
  }

  async testPolicy(booking, policy, currentTime = new Date()) {
    return this.calculateRefundAmount(booking, policy, currentTime);
  }
}

const refundService = new RefundService();

module.exports = {
  RefundService,
  refundService,
};
