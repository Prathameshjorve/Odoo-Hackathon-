class RefundError extends Error {
  constructor(message, code, metadata = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.metadata = metadata;
  }
}

class IneligibleRefundError extends RefundError {}
class GatewayTimeoutError extends RefundError {}
class DuplicateRefundError extends RefundError {}
class RefundTransitionError extends RefundError {}

module.exports = {
  RefundError,
  IneligibleRefundError,
  GatewayTimeoutError,
  DuplicateRefundError,
  RefundTransitionError,
};
