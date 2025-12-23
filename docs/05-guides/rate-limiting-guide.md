---
title: Rate Limiting Guide
---

# Rate Limiting Guide

This guide explains how to use rate limiting in the Haystack Payment Orchestration Service.

## Overview

Rate limiting is implemented using Redis sliding window algorithm. It's applied globally but can be customized per controller or endpoint.

## Default Limits

- **Test Mode:** 100 requests/hour per API key
- **Live Mode:** 10,000 requests/hour per API key

## Configuration Priority

Rate limit configuration is resolved in this order:
1. Method-level decorator (`@RateLimit()` on method)
2. Class-level decorator (`@RateLimit()` on controller)
3. Config file endpoint override
4. Config file controller override
5. Default based on mode (test/live)

## Usage

### Basic Usage

Rate limiting is applied automatically to all routes. No configuration needed for default behavior.

### Custom Rate Limits

**Per endpoint:**
```typescript
import { RateLimit } from '@common/redis';

@Controller('payments')
export class PaymentController {
  // Custom limit: 1000 requests/hour
  @RateLimit({ requests: 1000, window: 3600 })
  @Get(':id')
  async getPayment(@Param('id') id: string) {
    return this.service.getPayment(id);
  }

  // Stricter limit: 50 requests/hour
  @RateLimit({ requests: 50, window: 3600 })
  @Post()
  async createPayment(@Body() dto: CreatePaymentDto) {
    return this.service.createPayment(dto);
  }
}
```

**Per controller:**
```typescript
@Controller('webhooks')
@RateLimit({ requests: 10000, window: 3600 }) // Applies to all methods
export class WebhookController {
  @Post('paystack')
  async paystackWebhook() { ... }

  @Post('stripe')
  async stripeWebhook() { ... }
}
```

**Skip rate limiting:**
```typescript
@Controller('health')
@RateLimit({ skip: true }) // No rate limiting
export class HealthController {
  @Get()
  async check() { ... }
}
```

### Configuration File

You can also configure rate limits in `redis.config.ts`:

```typescript
rateLimit: {
  defaults: {
    test: { requests: 100, window: 3600 },
    live: { requests: 10000, window: 3600 },
  },
  endpoints: {
    'PaymentController.createPayment': {
      requests: 30,
      window: 3600,
    },
  },
  controllers: {
    'HealthController': {
      skip: true,
    },
  },
}
```

## Rate Limit Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9995
X-RateLimit-Reset: 2024-12-20T11:00:00Z
Retry-After: 300  # Only present when limit exceeded
```

## Error Response

When rate limit is exceeded:

```json
{
  "success": false,
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. You can make 10000 requests per hour. Try again in 300 seconds.",
    "type": "rate_limit_error",
    "details": {
      "limit": 10000,
      "remaining": 0,
      "resetAt": "2024-12-20T11:00:00Z",
      "retryAfter": 300
    }
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2024-12-20T10:55:00Z"
  }
}
```

## Graceful Degradation

If Redis is unavailable, rate limiting gracefully degrades:
- Requests are allowed (fallback mode)
- Warning is logged
- Headers still include limit information

## Best Practices

1. **Set appropriate limits** - Balance between protection and usability
2. **Use different limits per endpoint** - Stricter for mutations, lenient for reads
3. **Monitor rate limit violations** - Check logs for patterns
4. **Document limits** - Include in API documentation
5. **Test rate limits** - Verify behavior in staging

## Testing

```typescript
// Test rate limit enforcement
it('should enforce rate limit', async () => {
  // Make requests up to limit
  for (let i = 0; i < 100; i++) {
    await request(app.getHttpServer())
      .get('/api/v1/payments')
      .set('Authorization', `Bearer ${apiKey}`)
      .expect(200);
  }

  // Next request should be rate limited
  await request(app.getHttpServer())
    .get('/api/v1/payments')
    .set('Authorization', `Bearer ${apiKey}`)
    .expect(429);
});
```

