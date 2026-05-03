const prisma = require('../../lib/prisma');

class AuditLogService {
  constructor(db = prisma) {
    this.db = db;
  }

  async logAction({ refundTransactionId, action, userId = null, role = null, ipAddress = null, userAgent = null, metadata = null }, tx = this.db) {
    return tx.refundAuditLog.create({
      data: {
        refundTransactionId,
        action,
        userId,
        role,
        ipAddress,
        userAgent,
        metadata,
      },
    });
  }

  async listByRefund(refundTransactionId, tx = this.db) {
    return tx.refundAuditLog.findMany({
      where: { refundTransactionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}

const auditLogService = new AuditLogService();

module.exports = { AuditLogService, auditLogService };
