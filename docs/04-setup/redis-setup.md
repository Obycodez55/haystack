---
title: Redis Setup Guide
---

# Redis Setup Guide

This guide covers setting up Redis for caching, rate limiting, and distributed locks in the Haystack Payment Orchestration Service.

## Prerequisites

- Redis 7 or higher
- Node.js 18+ with npm/pnpm

## Installation

### 1. Install Redis

**macOS:**

```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**

```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
```

**Docker:**

```bash
docker run --name haystack-redis \
  -p 6379:6379 \
  -d redis:7-alpine
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs:

- `ioredis` - Redis client for Node.js

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Redis Connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional, leave empty for local dev
REDIS_DB=0

# Connection Settings
REDIS_KEY_PREFIX=haystack:
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000
REDIS_CONNECT_TIMEOUT=10000
REDIS_COMMAND_TIMEOUT=5000
REDIS_LAZY_CONNECT=false
REDIS_KEEP_ALIVE=30000

# TTL Defaults
REDIS_DEFAULT_TTL=3600
REDIS_IDEMPOTENCY_TTL=86400
REDIS_LOCK_TTL=30
REDIS_CACHE_TTL_PAYMENT=300
REDIS_CACHE_TTL_PROVIDER=60
REDIS_CACHE_TTL_TENANT=900

# Rate Limiting
REDIS_RATE_LIMIT_TEST_REQUESTS=100
REDIS_RATE_LIMIT_TEST_WINDOW=3600
REDIS_RATE_LIMIT_LIVE_REQUESTS=10000
REDIS_RATE_LIMIT_LIVE_WINDOW=3600
```

## Architecture

### Module Structure

```
src/common/redis/
├── redis.module.ts          # Redis module configuration
├── redis.service.ts         # Core Redis service
├── services/
│   ├── rate-limit.service.ts  # Rate limiting logic
│   └── cache.service.ts       # Caching logic
├── guards/
│   └── rate-limit.guard.ts    # Rate limit guard
├── interceptors/
│   ├── cache.interceptor.ts   # Cache interceptor
│   └── cache-invalidate.interceptor.ts  # Cache invalidation
├── decorators/
│   ├── rate-limit.decorator.ts  # @RateLimit() decorator
│   └── cache.decorator.ts       # @Cache() decorator
└── utils/
    ├── key-builder.util.ts     # Key naming utilities
    └── window-calculator.util.ts  # Rate limit window calculations
```

## Usage Examples

### Rate Limiting

**Default (per API key):**

```typescript
@Controller('payments')
export class PaymentController {
  // Uses default rate limit from config
  @Get()
  async listPayments() { ... }
}
```

**Custom per endpoint:**

```typescript
@Controller('payments')
export class PaymentController {
  @RateLimit({ requests: 1000, window: 3600 }) // 1000/hour
  @Get(':id')
  async getPayment(@Param('id') id: string) { ... }

  @RateLimit({ requests: 50, window: 3600 }) // 50/hour
  @Post()
  async createPayment() { ... }
}
```

**Per controller:**

```typescript
@Controller('webhooks')
@RateLimit({ requests: 10000, window: 3600 }) // Applies to all methods
export class WebhookController {
  @Post('paystack')
  async paystackWebhook() { ... }
}
```

### Caching

**Using decorator:**

```typescript
@Controller('payments')
export class PaymentController {
  @Cache('payment', { ttl: 300, namespace: 'payment' })
  @Get(':id')
  async getPayment(@Param('id') id: string) {
    return this.service.getPayment(id);
  }
}
```

**Using service directly:**

```typescript
@Injectable()
export class PaymentService {
  constructor(private readonly cache: CacheService) {}

  async getPayment(id: string, tenantId: string): Promise<Payment> {
    return this.cache.getOrSet(
      `payment:${id}`,
      () => this.repository.findById(id, tenantId),
      { namespace: 'payment', ttl: 300 },
    );
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
    const payment = await this.repository.update(id, tenantId, updates);

    // Invalidate cache
    await this.cache.delete(`payment:${id}`, 'payment');

    return payment;
  }
}
```

**Cache invalidation:**

```typescript
@Controller('payments')
export class PaymentController {
  @CacheInvalidate({ pattern: 'payment:{id}', namespace: 'payment' })
  @Patch(':id')
  async updatePayment(@Param('id') id: string) {
    return this.service.updatePayment(id);
  }

  @CacheInvalidate({ tags: ['payments', 'tenant:{tenantId}'] })
  @Post()
  async createPayment() {
    return this.service.createPayment();
  }
}
```

## Health Checks

Redis health is automatically checked at:

- `/health` - Full health check
- `/health/ready` - Readiness probe (includes Redis)

## Key Naming Conventions

All Redis keys follow the pattern: `{prefix}:{namespace}:{identifier}`

**Examples:**

- Rate limits: `haystack:rate_limit:test:tenant1:apiKey1:w3600`
- Cache: `haystack:cache:payment:payment:123`
- Idempotency: `haystack:idempotency:tenant1:key123`
- Locks: `haystack:lock:payment:123`

## Best Practices

1. **Always use key builder utilities** - Ensures consistent naming
2. **Set appropriate TTLs** - Based on data volatility
3. **Invalidate cache on updates** - Use decorators or service methods
4. **Handle Redis failures gracefully** - Services degrade gracefully
5. **Monitor Redis memory** - Use health check endpoint

## Troubleshooting

### Connection Issues

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Check connection
redis-cli -h localhost -p 6379 ping
```

### Memory Issues

```bash
# Check memory usage
redis-cli info memory

# Check keys
redis-cli keys "haystack:*"
```

## Production Considerations

1. **Use Redis password** - Set `REDIS_PASSWORD` in production
2. **Enable persistence** - Configure RDB or AOF
3. **Use Redis Cluster** - For high availability (future)
4. **Monitor memory** - Set up alerts
5. **Use connection pooling** - Configured automatically
