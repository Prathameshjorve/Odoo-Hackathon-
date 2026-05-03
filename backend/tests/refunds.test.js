const test = require('node:test');
const assert = require('node:assert/strict');

const { RefundCalculatorFactory } = require('../src/services/refunds/refundCalculators');
const { RefundStateMachine } = require('../src/services/refunds/refundStateMachine');
const { CircuitBreaker } = require('../src/services/refunds/circuitBreaker');
const { RefundService } = require('../src/services/refundService');
const { DuplicateRefundError } = require('../src/services/refunds/refundError');

function createMockEventBus() {
  return {
    on() {},
    emitRefundRequested() {},
    emitRefundApproved() {},
    emitRefundProcessing() {},
    emitRefundCompleted() {},
    emitRefundFailed() {},
    emitWebhookReceived() {},
  };
}

function createMockRepository(state) {
  return {
    db: state.db,
    acquireLock: async () => true,
    releaseLock: async () => true,
    findBookingById: async (bookingId) => state.bookings[bookingId] || null,
    findPolicyByOrganizationId: async (organizationId) => state.policies[organizationId] || null,
    findRefundByBookingId: async (bookingId) => state.refundsByBookingId[bookingId] || null,
    findRefundById: async (refundId) => state.refundsById[refundId] || null,
    createRefundTransaction: async (data, tx) => {
      const refund = { id: `refund_${Object.keys(state.refundsById).length + 1}`, ...data, statusHistory: data.statusHistory || [], createdAt: new Date(), updatedAt: new Date() };
      state.refundsById[refund.id] = refund;
      state.refundsByBookingId[refund.bookingId] = refund;
      return refund;
    },
    updateRefundTransaction: async (id, data) => {
      state.refundsById[id] = { ...state.refundsById[id], ...data, updatedAt: new Date() };
      return state.refundsById[id];
    },
    createRefundEvent: async () => ({ id: 'event_1' }),
    createWebhookEvent: async () => ({ id: 'webhook_1' }),
    updateWebhookEvent: async () => ({ id: 'webhook_1' }),
    listRefunds: async () => Object.values(state.refundsById),
    listFailedRefunds: async () => Object.values(state.refundsById).filter((refund) => refund.status === 'FAILED'),
    metrics: async () => ({ totalRefundedAmount: 1000, totalRefundCount: 1, pendingApprovals: 0, failedRefunds: 0, topRefundReasons: [] }),
    lockRefundTransaction: async (refundId) => state.refundsById[refundId] || null,
  };
}

function createMockDb(state) {
  const tx = {
    refundTransaction: {
      create: async (args) => {
        const refund = { id: `refund_${Object.keys(state.refundsById).length + 1}`, ...args.data, statusHistory: args.data.statusHistory || [], createdAt: new Date(), updatedAt: new Date() };
        state.refundsById[refund.id] = refund;
        state.refundsByBookingId[refund.bookingId] = refund;
        return refund;
      },
      update: async ({ where, data }) => {
        state.refundsById[where.id] = { ...state.refundsById[where.id], ...data, updatedAt: new Date() };
        return state.refundsById[where.id];
      },
      findUnique: async ({ where }) => state.refundsById[where.id] || state.refundsByBookingId[where.bookingId] || null,
    },
    refundEvent: {
      create: async (args) => ({ id: 'event_1', ...args.data }),
    },
    booking: {
      update: async ({ where, data }) => {
        state.bookings[where.id] = { ...state.bookings[where.id], ...data };
        return state.bookings[where.id];
      },
      findUnique: async ({ where }) => state.bookings[where.id] || null,
    },
    organizationRazorpayConnection: {
      findUnique: async () => ({ razorpayMerchantId: 'acct_123' }),
    },
    $queryRaw: async () => null,
  };

  return {
    $transaction: async (fn) => fn(tx),
    ...tx,
  };
}

test('Full refund within 48 hours', () => {
  const calculator = RefundCalculatorFactory.getCalculator('FULL');
  const booking = { amountPaid: 10000, startTime: new Date(Date.now() + 72 * 60 * 60 * 1000) };
  const policy = { rules: [{ hoursBefore: 48, percentage: 100, fee: 0 }, { hoursBefore: 24, percentage: 75, fee: 500 }, { hoursBefore: 0, percentage: 0, fee: 0 }], globalProcessingFee: 0 };

  const result = calculator.calculate(booking, policy, new Date());
  assert.equal(result.refundAmount, 10000);
});

test('Partial refund between 24-48 hours', () => {
  const calculator = RefundCalculatorFactory.getCalculator('PARTIAL');
  const booking = { amountPaid: 10000, startTime: new Date(Date.now() + 30 * 60 * 60 * 1000) };
  const policy = { rules: [{ hoursBefore: 48, percentage: 100, fee: 0 }, { hoursBefore: 24, percentage: 75, fee: 0 }, { hoursBefore: 0, percentage: 0, fee: 0 }], globalProcessingFee: 0 };

  const result = calculator.calculate(booking, policy, new Date());
  assert.equal(result.refundAmount, 7500);
});

test('No refund after 24 hours', () => {
  const calculator = RefundCalculatorFactory.getCalculator('CUSTOM');
  const booking = { amountPaid: 10000, startTime: new Date(Date.now() + 6 * 60 * 60 * 1000) };
  const policy = { rules: [{ hoursBefore: 48, percentage: 100, fee: 0 }, { hoursBefore: 24, percentage: 75, fee: 0 }, { hoursBefore: 0, percentage: 0, fee: 0 }], globalProcessingFee: 0 };

  const result = calculator.calculate(booking, policy, new Date());
  assert.equal(result.refundAmount, 0);
});

test('State machine blocks invalid transition', () => {
  const machine = new RefundStateMachine();
  assert.equal(machine.canTransition('PENDING', 'APPROVED'), true);
  assert.equal(machine.canTransition('COMPLETED', 'PROCESSING'), false);
  assert.throws(() => machine.transition('COMPLETED', 'PROCESSING'));
});

test('Circuit breaker opens after 3 failures', async () => {
  const breaker = new CircuitBreaker({ failureThreshold: 3, timeout: 50, resetTimeout: 1000 });
  const failing = async () => {
    throw new Error('boom');
  };

  await assert.rejects(() => breaker.execute(failing));
  await assert.rejects(() => breaker.execute(failing));
  await assert.rejects(() => breaker.execute(failing));
  await assert.rejects(() => breaker.execute(async () => 'ok'), /Circuit breaker open/);
});

test('RefundService prevents duplicate refunds', async () => {
  const state = {
    bookings: {
      booking_1: {
        id: 'booking_1',
        userId: 'user_1',
        paymentStatus: 'PAID',
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        appointment: { organizationId: 'org_1' },
        razorpayPaymentId: 'pay_test_123',
      },
    },
    policies: {
      org_1: { rules: [{ hoursBefore: 24, percentage: 100, fee: 0 }], requiresApproval: false, autoProcessAbove: 20000 },
    },
    refundsById: {},
    refundsByBookingId: {
      booking_1: { id: 'refund_existing', bookingId: 'booking_1', status: 'PENDING' },
    },
    db: null,
  };
  state.db = createMockDb(state);
  const service = new RefundService({
    repository: createMockRepository(state),
    eventBus: createMockEventBus(),
    refundClient: { createRefund: async () => ({ id: 'rf_1' }) },
    queue: null,
  });

  await assert.rejects(() => service.requestRefund('booking_1', 'user_1', 'CUSTOMER_REQUEST', {}), DuplicateRefundError);
});

test('RefundService processes refund end-to-end with mock Razorpay', async () => {
  const state = {
    bookings: {
      booking_1: {
        id: 'booking_1',
        userId: 'user_1',
        paymentStatus: 'PAID',
        amountPaid: 10000,
        totalAmount: 10000,
        startTime: new Date(Date.now() + 72 * 60 * 60 * 1000),
        appointment: { organizationId: 'org_1' },
        razorpayPaymentId: 'pay_test_123',
      },
    },
    policies: {
      org_1: { rules: [{ hoursBefore: 24, percentage: 100, fee: 0 }], requiresApproval: false, autoProcessAbove: 20000 },
    },
    refundsById: {},
    refundsByBookingId: {},
    db: null,
  };
  state.db = createMockDb(state);
  const service = new RefundService({
    repository: createMockRepository(state),
    eventBus: createMockEventBus(),
    refundClient: { createRefund: async () => ({ id: 'rf_123', payment_id: 'pay_test_123' }) },
    queue: null,
  });

  const created = await service.requestRefund('booking_1', 'user_1', 'CUSTOMER_REQUEST', {});
  assert.equal(created.status, 'APPROVED');

  const completed = await service.processRefund(created.id, 'admin_1');
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(state.bookings.booking_1.paymentStatus, 'REFUNDED');
});
