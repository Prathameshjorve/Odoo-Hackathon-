const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { refundEventBus } = require('../services/refunds/refundEventBus');

let observersRegistered = false;

function verifySignature(rawBody, signature) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return true;
  }

  if (!rawBody || !signature) {
    return false;
  }

  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return expected === signature;
}

async function findRefundByGatewayEntity(entity) {
  if (!entity) {
    return null;
  }

  return prisma.refundTransaction.findFirst({
    where: {
      OR: [
        entity.id ? { razorpayRefundId: entity.id } : null,
        entity.payment_id ? { razorpayPaymentId: entity.payment_id } : null,
      ].filter(Boolean),
    },
    include: { booking: { include: { appointment: { include: { organization: true } }, user: true } } },
  });
}

function registerObservers() {
  if (observersRegistered) {
    return;
  }

  refundEventBus.on('refund.webhook.received', async (payload) => {
    const entity = payload.entity || {};
    const refund = await findRefundByGatewayEntity(entity);
    if (!refund) {
      return;
    }

    const history = Array.isArray(refund.statusHistory) ? [...refund.statusHistory] : [];
    const append = (status, note) => history.push({ status, note, operator: 'webhook', timestamp: new Date().toISOString() });

    if (payload.eventType === 'refund.created') {
      append('PROCESSING', 'Refund created in Razorpay');
      await prisma.refundTransaction.update({
        where: { id: refund.id },
        data: {
          status: 'PROCESSING',
          razorpayRefundId: entity.id || refund.razorpayRefundId,
          razorpayWebhookId: payload.eventId,
          statusHistory: history,
          lastError: null,
        },
      });
    }

    if (payload.eventType === 'refund.processed') {
      append('COMPLETED', 'Refund processed via webhook');
      await prisma.$transaction(async (tx) => {
        await tx.refundTransaction.update({
          where: { id: refund.id },
          data: {
            status: 'COMPLETED',
            razorpayRefundId: entity.id || refund.razorpayRefundId,
            razorpayWebhookId: payload.eventId,
            completedAt: new Date(),
            processedAt: new Date(),
            statusHistory: history,
            lastError: null,
          },
        });

        await tx.booking.update({ where: { id: refund.bookingId }, data: { paymentStatus: 'REFUNDED' } });
      });
    }

    if (payload.eventType === 'refund.failed') {
      append('FAILED', entity.error_description || 'Refund failed via webhook');
      await prisma.refundTransaction.update({
        where: { id: refund.id },
        data: {
          status: 'FAILED',
          razorpayRefundId: entity.id || refund.razorpayRefundId,
          razorpayWebhookId: payload.eventId,
          lastError: entity.error_description || 'Refund failed via webhook',
          statusHistory: history,
          retryCount: (refund.retryCount || 0) + 1,
        },
      });
    }
  });

  observersRegistered = true;
}

async function handleRazorpayRefundWebhook(req, res) {
  try {
    registerObservers();

    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body || {});

    if (!verifySignature(rawBody, signature)) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const eventType = req.body?.event || 'unknown';
    const entity = req.body?.payload?.refund?.entity || req.body?.payload?.payment?.entity || {};
    const eventId = req.body?.payload?.refund?.entity?.id || req.body?.payload?.payment?.entity?.id || req.body?.id || `${eventType}:${entity.id || entity.payment_id || Date.now()}`;

    const existing = await prisma.refundWebhookEvent.findUnique({ where: { eventId } });
    if (existing) {
      return res.status(200).json({ success: true, message: 'Webhook already processed' });
    }

    await prisma.refundWebhookEvent.create({
      data: {
        eventId,
        eventType,
        payload: req.body,
        signature: signature || null,
        status: 'PROCESSING',
      },
    });

    refundEventBus.emitWebhookReceived({
      eventId,
      eventType,
      signature: signature || null,
      rawBody,
      entity,
    });

    await prisma.refundWebhookEvent.update({
      where: { eventId },
      data: { status: 'COMPLETED', processedAt: new Date() },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Razorpay refund webhook error:', error);
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
}

module.exports = {
  handleRazorpayRefundWebhook,
  registerObservers,
};
