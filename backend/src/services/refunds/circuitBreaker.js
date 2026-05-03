class CircuitBreaker {
  constructor({ failureThreshold = 3, timeout = 10000, resetTimeout = 60000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.timeout = timeout;
    this.resetTimeout = resetTimeout;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureAt = null;
  }

  canAttempt() {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      const elapsed = Date.now() - (this.lastFailureAt || 0);
      if (elapsed >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        return true;
      }

      return false;
    }

    return true;
  }

  success() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureAt = null;
  }

  failure() {
    this.failureCount += 1;
    this.lastFailureAt = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  async execute(operation) {
    if (!this.canAttempt()) {
      throw new Error('Circuit breaker open');
    }

    const operationPromise = Promise.resolve().then(operation);
    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(new Error('Circuit breaker timeout'));
      }, this.timeout);
    });

    try {
      const result = await Promise.race([operationPromise, timeoutPromise]);
      this.success();
      return result;
    } catch (error) {
      this.failure();
      throw error;
    }
  }
}

module.exports = { CircuitBreaker };
