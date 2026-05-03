const Bull = require('bull');

function createRefundQueue() {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_CONNECTION_URL;
  if (!redisUrl) {
    return null;
  }

  const parsedUrl = new URL(redisUrl);
  const redisOptions = {
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 6379),
  };

  if (parsedUrl.password) {
    redisOptions.password = parsedUrl.password;
  }

  return new Bull('refund-processing', {
    redis: redisOptions,
    defaultJobOptions: {
      attempts: Number(process.env.REFUND_MAX_RETRIES || 3),
      backoff: {
        type: 'exponential',
        delay: Number((process.env.REFUND_RETRY_DELAYS || '1000,5000,15000').split(',')[0] || 1000),
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });
}

async function registerRefundProcessor(queue, refundService) {
  if (!queue) {
    return null;
  }

  queue.process('process-refund', 5, async (job) => {
    const { refundId, adminId } = job.data;
    return refundService.processRefund(refundId, adminId);
  });

  queue.on('failed', async (job, error) => {
    if (job?.data?.refundId) {
      await refundService.handleRefundFailure(job.data.refundId, error, job.attemptsMade + 1);
    }
  });

  return queue;
}

module.exports = {
  createRefundQueue,
  registerRefundProcessor,
};
