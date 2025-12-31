---
title: Caching Guide
---

# Caching Guide

This guide explains how to use caching in the Haystack Payment Orchestration Service.

## Overview

Caching is implemented using Redis with automatic cache-aside pattern. It prevents stale data through TTL expiration and cache invalidation.

## Cache TTL Strategy

Different data types have different TTLs based on volatility:

- **Payment Status:** 5 minutes (can change frequently)
- **Provider Health:** 1 minute (changes frequently)
- **Tenant Info:** 15 minutes (changes rarely)
- **Reference Data:** 24 hours (static data)

## Usage

### Using Decorators

**Cache GET requests:**

```typescript
import { Cache } from '@common/redis';

@Controller('payments')
export class PaymentController {
  @Cache('payment', { ttl: 300, namespace: 'payment' })
  @Get(':id')
  async getPayment(@Param('id') id: string) {
    return this.service.getPayment(id);
  }
}
```

**Invalidate on update:**

```typescript
import { CacheInvalidate } from '@common/redis';

@Controller('payments')
export class PaymentController {
  @CacheInvalidate({ pattern: 'payment:{id}', namespace: 'payment' })
  @Patch(':id')
  async updatePayment(@Param('id') id: string) {
    return this.service.updatePayment(id);
  }

  @CacheInvalidate({ tags: ['payments'] })
  @Post()
  async createPayment() {
    return this.service.createPayment();
  }
}
```

### Using Service Directly

**Cache-aside pattern:**

```typescript
import { CacheService } from '@common/redis';

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
}
```

**Write-through pattern:**

```typescript
async updatePaymentStatus(
  id: string,
  tenantId: string,
  status: PaymentStatus,
): Promise<Payment> {
  return this.cache.writeThrough(
    `payment:${id}`,
    async () => {
      return this.repository.updateStatus(id, tenantId, status);
    },
    { namespace: 'payment', ttl: 300 },
  );
}
```

**Cache stampede prevention:**

```typescript
async getPayment(id: string, tenantId: string): Promise<Payment> {
  return this.cache.getOrSetWithLock(
    `payment:${id}`,
    () => this.repository.findById(id, tenantId),
    { namespace: 'payment', ttl: 300 },
  );
}
```

## Cache Invalidation

### Pattern-Based Invalidation

```typescript
// Invalidate specific payment
await this.cache.delete('payment:123', 'payment');

// Invalidate all payments for tenant
await this.cache.invalidate('payment:tenant:tenant1:*', 'payment');

// Invalidate all payments
await this.cache.invalidate('payment:*', 'payment');
```

### Tag-Based Invalidation

```typescript
// Set cache with tags
await this.cache.set('payment:123', payment, {
  namespace: 'payment',
  ttl: 300,
  tags: ['payments', 'tenant:tenant1'],
});

// Invalidate by tag
await this.cache.invalidateByTag('payments'); // Invalidates all payments
await this.cache.invalidateByTag('tenant:tenant1'); // Invalidates all tenant1 data
```

## Preventing Stale Data

### Strategy 1: TTL Expiration

Set appropriate TTLs based on data volatility:

```typescript
// Frequently changing - short TTL
@Cache('provider-health', { ttl: 60, namespace: 'provider' })

// Rarely changing - long TTL
@Cache('tenant-info', { ttl: 900, namespace: 'tenant' })
```

### Strategy 2: Event-Driven Invalidation

Invalidate cache when data changes:

```typescript
@CacheInvalidate({ pattern: 'payment:{id}', namespace: 'payment' })
@Patch(':id')
async updatePayment() { ... }
```

### Strategy 3: Write-Through Caching

Update cache immediately when data changes:

```typescript
async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
  return this.cache.writeThrough(
    `payment:${id}`,
    async () => this.repository.update(id, tenantId, updates),
    { namespace: 'payment', ttl: 300 },
  );
}
```

### Strategy 4: Cache Versioning

Include version in cache key for schema changes:

```typescript
const CACHE_VERSION = '1.0';
const key = `payment:${id}:v${CACHE_VERSION}`;
```

## Best Practices

1. **Set appropriate TTLs** - Based on data volatility
2. **Always invalidate on updates** - Use decorators or service methods
3. **Use cache-aside pattern** - For read-heavy operations
4. **Use write-through for critical data** - Ensures cache is always fresh
5. **Prevent cache stampede** - Use `getOrSetWithLock` for high-traffic endpoints
6. **Monitor cache hit rates** - Check health endpoint
7. **Use tags for bulk invalidation** - When related data changes

## Monitoring

Cache metrics are available at `/health` endpoint:

```json
{
  "redis": {
    "status": "up",
    "latency": 2,
    "stats": {
      "connectedClients": 5,
      "usedMemory": 1048576
    }
  }
}
```

## Troubleshooting

### Cache Not Working

1. Check Redis connection: `/health`
2. Verify decorator is applied correctly
3. Check cache key format
4. Verify TTL is set correctly

### Stale Data

1. Ensure cache invalidation on updates
2. Check TTL is appropriate
3. Verify invalidation patterns match cache keys
4. Use write-through for critical data
