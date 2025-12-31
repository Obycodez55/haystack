# Infrastructure Components

This document outlines all infrastructure components implemented in the Haystack application.

## Implemented Components

### ✅ 1. Health Checks

**Location:** `src/common/health/`

**Endpoints:**
- `GET /health` - Basic health check
- `GET /health/live` - Liveness probe (Kubernetes)
- `GET /health/ready` - Readiness probe (Kubernetes)

**Status:** Basic implementation complete. Database and Redis checks will be added when those services are implemented.

**Usage:**
```typescript
// Health checks are automatically available
// Access at: http://localhost:3000/health
```

### ✅ 2. Request Validation

**Location:** `src/common/pipes/validation.pipe.ts`

**Features:**
- Global validation pipe using class-validator
- Automatic transformation with class-transformer
- Custom error formatting to match API spec
- Whitelist validation (strips unknown properties)
- Nested validation support

**Usage:**
```typescript
// Automatically applied globally
// Use DTOs with class-validator decorators
import { IsString, IsEmail, IsNumber } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsEmail()
  customerEmail: string;

  @IsNumber()
  @Min(1)
  amount: number;
}
```

### ✅ 3. API Versioning

**Location:** `src/common/guards/version.guard.ts`

**Features:**
- URI-based versioning (`/api/v1/...`)
- Default version: `v1`
- Version extraction from URL path
- Optional header-based versioning support

**Configuration:**
- Global prefix: `/api` (configurable via `GLOBAL_PREFIX`)
- API version: `v1` (configurable via `API_VERSION`)
- Full path: `/api/v1/...`

**Usage:**
```typescript
@Controller('payments')
@Version('1') // Optional - defaults to v1
export class PaymentController {
  // Routes automatically prefixed with /api/v1
}
```

### ✅ 4. Security Headers (Helmet)

**Location:** `src/main.ts`

**Features:**
- Content Security Policy (CSP)
- XSS Protection
- Frame Options
- MIME Type Sniffing Protection
- Referrer Policy

**Configuration:**
- Automatically applied to all routes
- Configurable CSP directives

### ✅ 5. CORS Configuration

**Location:** `src/main.ts`

**Features:**
- Configurable origins (via `CORS_ORIGIN` env var)
- Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Custom headers support
- Credentials enabled
- 24-hour max age

**Configuration:**
```bash
CORS_ORIGIN=http://localhost:3000,https://app.example.com
```

### ✅ 6. Response Compression

**Location:** `src/main.ts`

**Features:**
- Automatic gzip compression
- Reduces response size
- Improves performance

**Status:** Automatically applied to all responses

### ✅ 7. Request Timeout

**Location:** `src/main.ts`

**Features:**
- Configurable timeout (default: 30 seconds)
- Returns 408 Request Timeout
- Prevents hanging requests

**Configuration:**
```bash
REQUEST_TIMEOUT=30000  # milliseconds
```

### ✅ 8. Graceful Shutdown

**Location:** `src/main.ts`

**Features:**
- Handles SIGTERM and SIGINT
- 5-second grace period for in-flight requests
- Proper connection cleanup
- Uncaught exception handling
- Unhandled rejection handling

**Behavior:**
- On shutdown signal: waits 5 seconds, then closes app
- Logs shutdown process
- Exits with appropriate code

## Configuration

### Environment Variables

```bash
# App Configuration
APP_NAME=haystack
APP_VERSION=0.0.1
NODE_ENV=development
PORT=3000
API_VERSION=v1
GLOBAL_PREFIX=api

# CORS
CORS_ORIGIN=http://localhost:3000

# Request Timeout
REQUEST_TIMEOUT=30000
```

## Request Flow

```
Request
  ↓
Correlation Middleware (adds correlation ID)
  ↓
Helmet (security headers)
  ↓
CORS (if applicable)
  ↓
Compression (response)
  ↓
Timeout Handler
  ↓
Version Guard (if enabled)
  ↓
Validation Pipe (if DTO)
  ↓
Controller
  ↓
Transform Interceptor (format response)
  ↓
Response
```

## Error Handling

All errors are caught by:
1. **ValidationPipe** - Validation errors → `ValidationError`
2. **HttpExceptionFilter** - All errors → Formatted API response

## Health Check Response

```json
{
  "status": "ok",
  "info": {
    "api": {
      "status": "up",
      "uptime": 123.45,
      "timestamp": "2024-12-22T12:00:00Z"
    }
  },
  "error": {},
  "details": {
    "api": {
      "status": "up",
      "uptime": 123.45,
      "timestamp": "2024-12-22T12:00:00Z"
    }
  }
}
```

## Future Enhancements

### When Database is Added:
- Database health check in `/health/ready`
- Connection pool monitoring
- Query performance metrics

### When Redis is Added:
- Redis health check in `/health/ready`
- Cache hit/miss metrics
- Connection status

### Rate Limiting (with Redis):
- Per-API-key rate limiting
- Redis-backed throttling
- Rate limit headers

### Idempotency (with Redis):
- Idempotency key handling
- Response caching
- Duplicate request prevention

## Testing

### Health Checks
```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
```

### Versioned Endpoints
```bash
curl http://localhost:3000/api/v1/payments
```

### Validation
```bash
# Should return validation error
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -d '{"amount": -100}'
```

## Monitoring

Health checks are designed for:
- **Kubernetes**: Use `/health/live` and `/health/ready`
- **Load Balancers**: Use `/health`
- **Monitoring Tools**: Poll `/health` endpoint
- **CI/CD**: Check health before deployment

