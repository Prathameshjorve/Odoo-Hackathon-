const EventEmitter = require('events');

class RefundEventBus extends EventEmitter {
  emitRefundRequested(payload) {
    return this.emit('refund.requested', payload);
  }

  emitRefundApproved(payload) {
    return this.emit('refund.approved', payload);
  }

  emitRefundProcessing(payload) {
    return this.emit('refund.processing', payload);
  }

  emitRefundCompleted(payload) {
    return this.emit('refund.completed', payload);
  }

  emitRefundFailed(payload) {
    return this.emit('refund.failed', payload);
  }

  emitWebhookReceived(payload) {
    return this.emit('refund.webhook.received', payload);
  }
}

const refundEventBus = new RefundEventBus();

module.exports = { RefundEventBus, refundEventBus };
