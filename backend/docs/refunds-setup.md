# Refund System Setup

## Redis
Set `REDIS_URL` to enable distributed locks, cache, and Bull processing.

Example:

```bash
REDIS_URL=redis://localhost:6379
```

## Bull queue
The refund worker is created automatically when Redis is configured. To process refund jobs in a separate process, start the app normally and keep Redis running.

## Razorpay webhook
Register the webhook endpoint:

```text
POST /webhooks/razorpay/refund
```

Set:

```bash
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

## Refund policy
The API supports tiered policies with JSON rules and special rules.

## Tests
Run the refund suite:

```bash
npm run test:refund
```
