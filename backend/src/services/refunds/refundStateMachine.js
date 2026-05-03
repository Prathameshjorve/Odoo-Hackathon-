const { RefundTransitionError } = require('./refundError');

const TRANSITIONS = {
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED', 'REQUIRES_MANUAL'],
  APPROVED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'FAILED', 'PARTIAL', 'REQUIRES_MANUAL'],
  FAILED: ['PROCESSING', 'REQUIRES_MANUAL', 'CANCELLED'],
  PARTIAL: ['COMPLETED', 'REQUIRES_MANUAL'],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
  REQUIRES_MANUAL: ['PROCESSING', 'CANCELLED'],
};

class RefundStateMachine {
  canTransition(from, to) {
    const allowed = TRANSITIONS[from] || [];
    return allowed.includes(to);
  }

  transition(from, to, metadata = {}) {
    if (from === to) {
      return { status: to, metadata };
    }

    if (!this.canTransition(from, to)) {
      throw new RefundTransitionError(`Invalid refund transition from ${from} to ${to}`, 'INVALID_REFUND_TRANSITION', {
        from,
        to,
      });
    }

    return { status: to, metadata };
  }

  appendHistory(history = [], status, note = '', operator = 'system') {
    const nextHistory = Array.isArray(history) ? [...history] : [];
    nextHistory.push({
      status,
      note,
      operator,
      timestamp: new Date().toISOString(),
    });
    return nextHistory;
  }
}

module.exports = { RefundStateMachine, TRANSITIONS };
