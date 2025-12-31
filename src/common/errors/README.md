# Error Handling System

Comprehensive error handling system with custom error classes, consistent error responses, and developer-friendly messages.

## Features

- ✅ **Type-Safe Errors**: TypeScript error classes with enums
- ✅ **Consistent Structure**: All errors follow the same API response format
- ✅ **Developer-Friendly**: Clear, actionable error messages
- ✅ **Automatic Formatting**: Exception filter handles all error formatting
- ✅ **Error Context**: Rich error details and documentation URLs
- ✅ **Retry Detection**: Errors can indicate if they're retryable

## Error Classes

### BaseError

All custom errors extend `BaseError`:

```typescript
abstract class BaseError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  abstract readonly type: ErrorType;
  readonly details?: Record<string, any>;
  readonly docUrl?: string;
  readonly userMessage?: string;
}
```

### PaymentError

Payment-related errors:

```typescript
import { PaymentError } from '@errors';

// Factory methods
throw PaymentError.invalidAmount(-100);
throw PaymentError.invalidCurrency('XYZ', ['NGN', 'USD', 'EUR']);
throw PaymentError.paymentNotFound('pay_123');
throw PaymentError.paymentFailed('pay_123', 'Provider timeout');
```

**Error Codes:**
- `invalid_amount`
- `invalid_currency`
- `insufficient_funds`
- `card_declined`
- `payment_failed`
- `payment_not_found`
- `payment_already_processed`
- `refund_failed`
- `refund_not_allowed`

### ProviderError

Payment provider errors (retryable):

```typescript
import { ProviderError } from '@errors';

throw ProviderError.timeout('paystack', 5000);
throw ProviderError.unavailable('stripe', 60);
throw ProviderError.invalidCredentials('flutterwave');
throw ProviderError.notConfigured('paystack');

// Check if retryable
if (error.isRetryable()) {
  // Retry logic
}
```

**Error Codes:**
- `provider_error`
- `provider_timeout` (retryable)
- `provider_rate_limit` (retryable)
- `provider_unavailable` (retryable)
- `provider_invalid_credentials`
- `provider_not_configured`

### ValidationError

Request validation errors:

```typescript
import { ValidationError } from '@errors';

throw ValidationError.missingField('customerEmail');
throw ValidationError.invalidValue('amount', -100, 'must be positive');
throw ValidationError.invalidEmail('invalid-email');
throw ValidationError.invalidCurrency('XYZ', ['NGN', 'USD']);
```

**Error Codes:**
- `validation_error`
- `missing_required_field`
- `invalid_field_value`
- `invalid_email`
- `invalid_currency`

### AuthenticationError

Authentication errors:

```typescript
import { AuthenticationError } from '@errors';

throw AuthenticationError.invalidApiKey();
throw AuthenticationError.missingApiKey();
throw AuthenticationError.apiKeyExpired();
throw AuthenticationError.apiKeyRevoked();
```

**Error Codes:**
- `authentication_error`
- `invalid_api_key`
- `api_key_expired`
- `api_key_revoked`
- `missing_api_key`

### AuthorizationError

Authorization/permission errors:

```typescript
import { AuthorizationError } from '@errors';

throw AuthorizationError.insufficientPermissions('payment:create');
throw AuthorizationError.forbidden('payment');
```

**Error Codes:**
- `authorization_error`
- `insufficient_permissions`
- `forbidden`
- `resource_access_denied`

### SystemError

System/internal errors:

```typescript
import { SystemError } from '@errors';

throw SystemError.internalError(cause);
throw SystemError.databaseError(cause);
throw SystemError.serviceUnavailable(60);
```

**Error Codes:**
- `internal_server_error`
- `database_error`
- `service_unavailable`

### NetworkError

Network-related errors (retryable):

```typescript
import { NetworkError } from '@errors';

throw NetworkError.timeout(5000);
throw NetworkError.connectionError(cause);

if (error.isRetryable()) {
  // Retry logic
}
```

**Error Codes:**
- `network_timeout` (retryable)
- `network_connection_error` (retryable)
- `network_dns_error` (retryable)

## Usage Examples

### Basic Error Throwing

```typescript
import { PaymentError } from '@errors';

async function processPayment(amount: number) {
  if (amount <= 0) {
    throw PaymentError.invalidAmount(amount);
  }
  
  // Process payment...
}
```

### Error with Details

```typescript
import { PaymentError } from '@errors';

try {
  await provider.createPayment(...);
} catch (error) {
  throw PaymentError.paymentFailed(
    paymentId,
    'Provider returned error',
    error,
  );
}
```

### Custom Error Message

```typescript
import { PaymentError, PaymentErrorCode } from '@errors';

throw new PaymentError(
  PaymentErrorCode.PAYMENT_FAILED,
  { paymentId, provider: 'paystack' },
  undefined,
  'Custom error message here',
);
```

## Error Response Format

All errors are automatically formatted to match the API specification:

```json
{
  "success": false,
  "error": {
    "code": "invalid_amount",
    "message": "The payment amount is invalid. Amount must be greater than 0 and within allowed limits.",
    "type": "payment_error",
    "details": {
      "field": "amount",
      "value": -100,
      "constraint": "must be positive and within limits",
      "errorCode": "invalid_amount"
    },
    "docUrl": "https://docs.yourapp.com/errors/invalid_amount"
  },
  "meta": {
    "requestId": "req_1234567890",
    "timestamp": "2024-12-20T10:30:00Z"
  }
}
```

## Exception Filter

The `HttpExceptionFilter` automatically:
- Catches all errors (custom and NestJS exceptions)
- Formats errors to consistent structure
- Logs errors with context
- Returns appropriate HTTP status codes

Registered globally in `CommonModule`, so no manual setup needed.

## Best Practices

1. **Use Factory Methods**: Prefer factory methods for common errors
   ```typescript
   // Good
   throw PaymentError.invalidAmount(amount);
   
   // Also good (for custom cases)
   throw new PaymentError(PaymentErrorCode.PAYMENT_FAILED, details);
   ```

2. **Include Context**: Always include relevant context in error details
   ```typescript
   throw PaymentError.paymentFailed(paymentId, reason, cause);
   ```

3. **Use Appropriate Error Types**: Choose the right error class
   ```typescript
   // Validation issue
   throw ValidationError.invalidValue('amount', -100);
   
   // Payment issue
   throw PaymentError.invalidAmount(-100);
   ```

4. **Check Retryability**: For provider/network errors, check if retryable
   ```typescript
   try {
     await provider.processPayment();
   } catch (error) {
     if (error instanceof ProviderError && error.isRetryable()) {
       // Implement retry logic
     }
     throw error;
   }
   ```

5. **Preserve Error Chain**: Include original error as cause
   ```typescript
   try {
     await processPayment();
   } catch (error) {
     throw PaymentError.paymentFailed(paymentId, undefined, error);
   }
   ```

## Error Codes Reference

See the API specification (`docs/04-api/api-specification.md`) for the complete error code taxonomy.

## Integration

Errors are automatically handled by the `HttpExceptionFilter` registered in `CommonModule`. No additional setup required - just throw errors and they'll be formatted correctly!

