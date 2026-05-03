const prisma = require('../lib/prisma');
const { refundService } = require('../services/refundService');

let refundSweepTimer = null;

async function sweepPendingRefunds() {
  const pendingRefunds = await prisma.refundTransaction.findMany({
    where: {
      status: { in: ['APPROVED', 'PROCESSING'] },
      completedAt: null,
    },
    orderBy: { updatedAt: 'asc' },
    take: Number(process.env.REFUND_SWEEP_BATCH_SIZE || 25),
  });

  for (const refund of pendingRefunds) {
    if (refund.status === 'APPROVED' || refund.status === 'PROCESSING') {
      await refundService.enqueueRefundProcessing(refund.id, refund.adminId || null).catch(() => null);
    }
  }

  return { scanned: pendingRefunds.length };
}

function startRefundQueueWorker() {
  if (refundSweepTimer) {
    return refundSweepTimer;
  }

  const enabled = String(process.env.ENABLE_AUTO_REFUND || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    return null;
  }

  const intervalMs = Number(process.env.REFUND_SWEEP_INTERVAL_MS || 5 * 60 * 1000);
  refundSweepTimer = setInterval(() => {
    sweepPendingRefunds().catch((error) => {
      console.error('Refund sweep worker error:', error);
    });
  }, intervalMs);

  // Run once on startup so approved refunds don't wait for the first interval.
  sweepPendingRefunds().catch((error) => {
    console.error('Initial refund sweep error:', error);
  });

  return refundSweepTimer;
}

module.exports = {
  startRefundQueueWorker,
  sweepPendingRefunds,
};
