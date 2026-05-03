const axios = require('axios');
const crypto = require('crypto');
const { CircuitBreaker } = require('./refunds/circuitBreaker');

class RazorpayRefundClient {
  constructor({ redisClient = null, circuitBreaker = null, logger = console } = {}) {
    this.redisClient = redisClient;
    this.logger = logger;
    this.circuitBreaker = circuitBreaker || new CircuitBreaker({
      failureThreshold: Number(process.env.REFUND_CIRCUIT_BREAKER_THRESHOLD || 3),
      timeout: Number(process.env.REFUND_PROCESSING_TIMEOUT || 30000),
      resetTimeout: 60000,
    });
  }

  buildAuthHeaders() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return null;
    }

    return {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    };
  }

  isMockMode(paymentId) {
    return process.env.NODE_ENV !== 'production' && (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET || String(paymentId || '').startsWith('pay_test') || process.env.RAZORPAY_MOCK_REFUNDS === 'true');
  }

  async retryWithBackoff(operation, { maxRetries = 3, baseDelay = 1000, maxDelay = 10000, retryableErrors = ['RATE_LIMIT', 'INTERNAL_ERROR', 'TIMEOUT'] } = {}) {
    let attempt = 0;
    let lastError = null;

    while (attempt <= maxRetries) {
      try {
        return await operation(attempt);
      } catch (error) {
        lastError = error;
        const retryable = retryableErrors.some((code) => String(error.code || error.message || '').includes(code)) || error.retryable;
        if (!retryable || attempt >= maxRetries) {
          throw error;
        }

        const delay = Math.min(maxDelay, baseDelay * (2 ** attempt));
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt += 1;
      }
    }

    throw lastError || new Error('Refund retry failed');
  }

  async createRefund(paymentId, amount, options = {}) {
    const idempotencyKey = options.idempotencyKey || `refund_${paymentId}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    if (this.isMockMode(paymentId)) {
      return {
        id: `rf_mock_${crypto.randomBytes(8).toString('hex')}`,
        payment_id: paymentId,
        amount,
        status: 'processed',
        speed: options.speed || 'normal',
        notes: options.notes || {},
        mocked: true,
        idempotencyKey,
      };
    }

    const headers = this.buildAuthHeaders();
    if (!headers) {
      throw new Error('Razorpay credentials are not configured');
    }

    const body = {
      amount,
      speed: options.speed || 'normal',
      notes: {
        bookingId: options.bookingId,
        reason: options.reason,
        initiatedBy: options.initiatedBy,
      },
    };

    if (options.connectedAccountId) {
      headers['X-Razorpay-Account'] = options.connectedAccountId;
    }

    return this.circuitBreaker.execute(() => this.retryWithBackoff(async () => {
      try {
        const response = await axios.post(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, body, {
          headers: {
            ...headers,
            'X-Razorpay-Idempotency': idempotencyKey,
          },
          timeout: Number(process.env.REFUND_PROCESSING_TIMEOUT || 30000),
        });
        return response.data;
      } catch (error) {
        const razorpayError = new Error(error.response?.data?.error?.description || error.response?.data?.message || error.message || 'Razorpay refund failed');
        razorpayError.code = error.response?.data?.error?.code || error.response?.status || 'RAZORPAY_REFUND_FAILED';
        razorpayError.retryable = ['RATE_LIMIT_ERROR', 'GATEWAY_ERROR', 'INTERNAL_SERVER_ERROR', 429, 502, 503, 504].includes(razorpayError.code);
        razorpayError.response = error.response;
        throw razorpayError;
      }
    }));
  }

  async getRefundStatus(refundId) {
    const cacheKey = `refund:status:${refundId}`;
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        this.logger.warn?.('Refund status cache read failed', error.message);
      }
    }

    const headers = this.buildAuthHeaders();
    if (!headers) {
      return { id: refundId, status: 'mocked', mocked: true };
    }

    const result = await this.circuitBreaker.execute(async () => {
      const response = await axios.get(`https://api.razorpay.com/v1/refunds/${refundId}`, {
        headers,
        timeout: Number(process.env.REFUND_PROCESSING_TIMEOUT || 30000),
      });
      return response.data;
    });

    if (this.redisClient) {
      try {
        await this.redisClient.set(cacheKey, JSON.stringify(result), { EX: 5 });
      } catch (error) {
        this.logger.warn?.('Refund status cache write failed', error.message);
      }
    }

    return result;
  }
}

module.exports = { RazorpayRefundClient };
