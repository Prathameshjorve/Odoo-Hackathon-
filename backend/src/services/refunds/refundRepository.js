const prisma = require('../../lib/prisma');

class RefundRepository {
  constructor(db = prisma) {
    this.db = db;
  }

  async findBookingById(bookingId, tx = this.db) {
    return tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        appointment: {
          include: {
            organization: true,
          },
        },
        user: true,
        resource: true,
        assignedUser: true,
        refundTransaction: true,
      },
    });
  }

  async findPolicyByOrganizationId(organizationId, tx = this.db) {
    return tx.refundPolicy.findUnique({ where: { organizationId } });
  }

  async upsertPolicy(organizationId, data, tx = this.db) {
    return tx.refundPolicy.upsert({
      where: { organizationId },
      update: data,
      create: { organizationId, ...data },
    });
  }

  async findRefundByBookingId(bookingId, tx = this.db) {
    return tx.refundTransaction.findUnique({ where: { bookingId }, include: { booking: { include: { appointment: { include: { organization: true } }, user: true } } } });
  }

  async findRefundById(refundId, tx = this.db) {
    return tx.refundTransaction.findUnique({ where: { id: refundId }, include: { booking: { include: { appointment: { include: { organization: true } }, user: true } } } });
  }

  async listRefunds(filters = {}, tx = this.db) {
    const where = {};
    if (filters.organizationId) {
      where.booking = { appointment: { organizationId: filters.organizationId } };
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.bookingId) {
      where.bookingId = filters.bookingId;
    }

    return tx.refundTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { booking: { include: { appointment: { include: { organization: true } }, user: true } } },
    });
  }

  async createRefundTransaction(data, tx = this.db) {
    return tx.refundTransaction.create({ data });
  }

  async updateRefundTransaction(id, data, tx = this.db) {
    return tx.refundTransaction.update({ where: { id }, data });
  }

  async createRefundEvent(data, tx = this.db) {
    return tx.refundEvent.create({ data });
  }

  async createWebhookEvent(data, tx = this.db) {
    return tx.refundWebhookEvent.create({ data });
  }

  async findWebhookEventByEventId(eventId, tx = this.db) {
    return tx.refundWebhookEvent.findUnique({ where: { eventId } });
  }

  async updateWebhookEvent(eventId, data, tx = this.db) {
    return tx.refundWebhookEvent.update({ where: { eventId }, data });
  }

  async createRetryJob(data, tx = this.db) {
    return tx.refundRetryQueue.create({ data });
  }

  async listFailedRefunds(tx = this.db) {
    return tx.refundTransaction.findMany({ where: { status: 'FAILED' }, orderBy: { updatedAt: 'desc' } });
  }

  async metrics(organizationId, tx = this.db) {
    const refunds = await tx.refundTransaction.findMany({
      where: organizationId ? { booking: { appointment: { organizationId } } } : {},
      include: { booking: { include: { appointment: true } } },
    });

    const totalRefundCount = refunds.length;
    const totalRefundedAmount = refunds.reduce((sum, refund) => sum + Number(refund.refundAmount || refund.amount || 0), 0);
    const pendingApprovals = refunds.filter((refund) => refund.status === 'PENDING').length;
    const failedRefunds = refunds.filter((refund) => refund.status === 'FAILED').length;

    const reasons = refunds.reduce((accumulator, refund) => {
      const key = refund.refundReason || refund.reason || 'OTHER';
      accumulator[key] = accumulator[key] || { reason: key, count: 0, amount: 0 };
      accumulator[key].count += 1;
      accumulator[key].amount += Number(refund.refundAmount || refund.amount || 0);
      return accumulator;
    }, {});

    return {
      totalRefundedAmount,
      totalRefundCount,
      pendingApprovals,
      failedRefunds,
      topRefundReasons: Object.values(reasons).sort((left, right) => right.count - left.count).slice(0, 5),
    };
  }

  async acquireLock(lockKey, ttlSeconds = 30, tx = null) {
    const redis = require('../../lib/redisClient');
    return redis.withRedis(async (client) => {
      return client.set(lockKey, 'locked', { NX: true, EX: ttlSeconds });
    }, null);
  }

  async releaseLock(lockKey) {
    const redis = require('../../lib/redisClient');
    return redis.withRedis(async (client) => {
      await client.del(lockKey);
      return true;
    }, true);
  }

  async lockRefundTransaction(refundId, tx = this.db) {
    if (!tx.$queryRaw) {
      return this.findRefundById(refundId, tx);
    }

    await tx.$queryRaw`SELECT id FROM RefundTransaction WHERE id = ${refundId} FOR UPDATE`;
    return this.findRefundById(refundId, tx);
  }
}

module.exports = { RefundRepository };
