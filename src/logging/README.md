# Logging Module

Comprehensive structured logging system for Haystack using Pino.

## Features

- ✅ **High Performance**: Uses Pino (3-5x faster than Winston)
- ✅ **Structured Logging**: JSON format for production, pretty print for development
- ✅ **Correlation IDs**: Automatic request tracking via AsyncLocalStorage
- ✅ **Sensitive Data Filtering**: Automatic redaction of sensitive fields
- ✅ **Payment-Specific Filtering**: Special handling for payment data
- ✅ **Business Events**: Specialized logging for payment events
- ✅ **Performance Metrics**: Built-in performance logging
- ✅ **Error Context**: Rich error information with categorization
- ✅ **Log Sampling**: Reduce volume for high-traffic endpoints

## Quick Start

### Basic Usage

```typescript
import { LoggerService } from '@common/logging';

@Injectable()
export class PaymentService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('PaymentService');
  }

  async processPayment(paymentId: string, amount: number) {
    try {
      this.logger.log('Processing payment', { paymentId, amount });

      // ... payment logic ...

      this.logger.logPaymentEvent(
        BusinessEventType.PAYMENT_COMPLETED,
        paymentId,
        'success',
        { amount, provider: 'paystack' },
      );

      return result;
    } catch (error) {
      this.logger.error('Payment processing failed', error, {
        paymentId,
        amount,
      });
      throw error;
    }
  }
}
```

### Log Levels

```typescript
// Info (default)
logger.log('User created', { userId: user.id });

// Error
logger.error('Database connection failed', error, { host: dbConfig.host });

// Warning
logger.warn('Rate limit approaching', { userId: user.id, requests: 95 });

// Debug (development only)
logger.debug('Cache hit', { key: cacheKey });

// Verbose (detailed debugging)
logger.verbose('Detailed operation info', { step: 'validation' });
```

### Business Events

```typescript
import { BusinessEventType } from '@common/logging';

// Payment events
logger.logPaymentEvent(
  BusinessEventType.PAYMENT_COMPLETED,
  paymentId,
  'success',
  { amount: 5000, provider: 'paystack' },
);

// Provider events
logger.logProviderEvent('paystack', 'fallback', transactionId, {
  reason: 'timeout',
});

// Generic business events
logger.logBusinessEvent(
  BusinessEventType.WEBHOOK_DELIVERED,
  'webhook',
  webhookId,
  'delivered',
  { endpoint: 'https://customer.com/webhook' },
);
```

### Performance Logging

```typescript
const startTime = Date.now();
// ... operation ...
const duration = Date.now() - startTime;

logger.logPerformance('database_query', duration, {
  query: 'SELECT * FROM payments',
  rowsReturned: 150,
});
```

### HTTP Request Logging

```typescript
logger.logRequest(
  'POST',
  '/api/v1/payments',
  201,
  245, // duration in ms
  {
    responseSize: 1024,
    userAgent: 'Mozilla/5.0...',
    ipAddress: '192.168.1.1',
  },
);
```

## Configuration

### Environment Variables

```bash
# Application
APP_NAME=haystack
NODE_ENV=development  # development | staging | production

# Logging
LOG_LEVEL=info  # error | warn | info | debug | verbose
LOG_PRETTY=true  # Enable pretty printing (development)
LOG_FILE_ENABLED=false  # Enable file logging
LOG_DIR=logs  # Log directory (if file logging enabled)
```

### Log Levels by Environment

- **Development**: `debug` or `verbose` (detailed logging)
- **Staging**: `info` (standard logging)
- **Production**: `warn` or `info` (minimal logging, errors always logged)

## Architecture

### Components

1. **LoggerService**: Main logging service (implements NestJS LoggerService)
2. **CorrelationMiddleware**: HTTP middleware for correlation ID tracking
3. **SensitiveDataFilter**: Automatic data sanitization
4. **PaymentDataFilter**: Payment-specific data filtering
5. **ErrorFormatter**: Error context extraction and categorization
6. **LogSampler**: Log sampling for high-volume endpoints

### Request Context

The correlation middleware automatically:

- Extracts or generates correlation ID from `X-Correlation-ID` header
- Generates unique request ID
- Captures IP address and user agent
- Stores context in AsyncLocalStorage for async operations

Access request context anywhere:

```typescript
import { getRequestContext } from '@common/logging';

const context = getRequestContext();
console.log(context?.correlationId); // Available in any async operation
```

## Sensitive Data Filtering

### Automatically Filtered Fields

**Completely Redacted:**

- `password`, `password_hash`, `pin`, `token`, `secret`, `api_key`, etc.

**Partially Masked:**

- `email`: `us***@example.com`
- `phone`: `+234***12`
- `account_number`: `123***45`

### Payment-Specific Fields

Additional filtering for:

- Card data: `card_number`, `cvv`, `expiry`
- Bank accounts: `account_number`, `routing_number`
- API keys: `provider_api_key`, `provider_secret`
- Webhook signatures: `signature`, `hmac_signature`

## Testing

### Mock Logger

```typescript
import { createMockLogger } from '@common/logging/utils/test-utils';

const mockLogger = createMockLogger();

const module = Test.createTestingModule({
  providers: [{ provide: LoggerService, useValue: mockLogger }],
});
```

### Test Logger (Collects Logs)

```typescript
import { TestLogger } from '@common/logging/utils/test-utils';

const testLogger = new TestLogger(configService);
testLogger.log('Test message');

const logs = testLogger.getLogsByLevel('info');
expect(logs).toHaveLength(1);
```

## Best Practices

1. **Set Context**: Always set context for your service

   ```typescript
   constructor(private logger: LoggerService) {
     this.logger.setContext('PaymentService');
   }
   ```

2. **Use Appropriate Levels**:
   - `error`: Errors that need attention
   - `warn`: Warnings that might indicate issues
   - `info`: Important business events
   - `debug`: Development debugging
   - `verbose`: Very detailed debugging

3. **Include Context**: Always include relevant context in logs

   ```typescript
   logger.log('Payment created', { paymentId, amount, currency });
   ```

4. **Filter Sensitive Data**: Don't manually filter - the logger does it automatically

5. **Use Business Events**: Use specialized methods for business events

   ```typescript
   logger.logPaymentEvent(...) // Better than generic log()
   ```

6. **Performance Logging**: Log slow operations
   ```typescript
   const duration = Date.now() - startTime;
   if (duration > 1000) {
     logger.logPerformance('slow_operation', duration, { ... });
   }
   ```

## Integration

The logging module is automatically integrated into the app:

1. **LoggingModule** is imported globally in `AppModule`
2. **CorrelationMiddleware** is applied to all routes
3. **LoggerService** is available via dependency injection

To enable automatic HTTP request/response logging, uncomment the interceptor in `logging.module.ts`:

```typescript
{
  provide: APP_INTERCEPTOR,
  useClass: LoggingInterceptor,
}
```

## Production Considerations

1. **Log Aggregation**: Use CloudWatch, Elasticsearch, or similar
2. **Log Rotation**: Consider `pino-roll` for file logging
3. **Sampling**: High-volume endpoints are automatically sampled
4. **Monitoring**: Set up alerts for error rates
5. **Retention**: Configure log retention policies

## Troubleshooting

### Logs not appearing

1. Check `LOG_LEVEL` environment variable
2. Verify logger context is set
3. Check if log sampling is filtering logs

### Performance issues

1. Reduce log level in production
2. Enable log sampling for high-volume endpoints
3. Use async logging (already enabled by default)

### Missing correlation IDs

1. Ensure `CorrelationMiddleware` is registered
2. Check middleware order (should be early in chain)
3. Verify AsyncLocalStorage is working (Node.js 12.17+)
