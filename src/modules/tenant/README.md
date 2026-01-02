# Tenant Module

Complete tenant isolation implementation with both application-level and database-level security.

## Components

### 1. TenantMiddleware

Extracts API key from request, validates it, and populates tenant context.

**Location:** `src/modules/tenant/middleware/tenant.middleware.ts`

**Features:**

- Extracts API key from `Authorization: Bearer sk_xxx` header
- Validates API key using bcrypt comparison
- Checks API key status (active, expired, revoked)
- Validates tenant is active
- Updates API key last used timestamp
- Populates RequestContext with tenant information

**Usage:** Automatically applied via `AppModule` (except health check endpoints)

### 2. TenantGuard

Validates tenant context is available for protected endpoints.

**Location:** `src/modules/tenant/guards/tenant.guard.ts`

**Features:**

- Ensures tenant context exists
- Validates tenant is active
- Supports optional tenant mode via `@OptionalTenant()` decorator

**Usage:**

```typescript
// Required tenant (default)
@UseGuards(TenantGuard)
@Get()
async getData() { }

// Optional tenant
@OptionalTenant()
@UseGuards(TenantGuard)
@Get()
async getPublicData() { }
```

### 3. TenantContextInterceptor

Automatically sets tenant context for Row Level Security (RLS) policies.

**Location:** `src/modules/tenant/interceptors/tenant-context.interceptor.ts`

**Features:**

- Calls `set_tenant_context()` before each request
- Ensures RLS policies are enforced at database level
- Clears tenant context after request (for debugging)

**Usage:** Automatically applied globally via `AppModule`

### 4. Tenant Decorators

Easy access to tenant information in controllers.

**Location:** `src/modules/tenant/decorators/tenant.decorator.ts`

**Usage:**

```typescript
import { Tenant, TenantId } from '@modules/tenant';

@Controller('payments')
export class PaymentController {
  @Get()
  async getPayments(
    @Tenant() tenant: TenantEntity,
    @TenantId() tenantId: string,
  ) {
    // tenant and tenantId automatically injected
  }
}
```

### 5. Tenant Context Utilities

Helper functions to access tenant from RequestContext.

**Location:** `src/modules/tenant/utils/tenant-context.util.ts`

**Usage:**

```typescript
import { getCurrentTenantId, requireTenantId } from '@modules/tenant';

// Get tenant ID (may be undefined)
const tenantId = getCurrentTenantId();

// Require tenant ID (throws if not available)
const tenantId = requireTenantId();
```

### 6. Updated BaseRepository

Automatically uses tenant from RequestContext when tenantId parameter is omitted.

**Location:** `src/common/database/repositories/base.repository.ts`

**Usage:**

```typescript
// Old way (still works)
const entities = await repository.findAll(tenantId);

// New way (uses RequestContext automatically)
const entities = await repository.findAll();
```

### 7. Tenant Service

Handles tenant profile, settings, and KYC management.

**Location:** `src/modules/tenant/services/tenant.service.ts`

**Features:**

- Profile management (get/update)
- Settings management (currency/timezone)
- KYC submission and status tracking
- Status validation (suspended/deleted checks)
- Input validation (ISO 4217 currency, IANA timezone)

**Methods:**

- `getProfile(tenantId)`: Get tenant profile information
- `updateProfile(tenantId, dto)`: Update tenant profile
- `getSettings(tenantId)`: Get tenant settings (currency, timezone)
- `updateSettings(tenantId, dto)`: Update tenant settings
- `submitKyc(tenantId, dto)`: Submit KYC information
- `getKycStatus(tenantId)`: Get KYC status

### 8. Tenant Controller

REST API endpoints for tenant operations.

**Location:** `src/modules/tenant/controllers/tenant.controller.ts`

**Endpoints:**

- `GET /tenant/profile` - Get tenant profile
- `PATCH /tenant/profile` - Update tenant profile
- `GET /tenant/settings` - Get tenant settings
- `PATCH /tenant/settings` - Update tenant settings
- `POST /tenant/kyc` - Submit KYC information
- `GET /tenant/kyc/status` - Get KYC status

**Authentication:** All endpoints require JWT authentication via `JwtAuthGuard`

**Usage Example:**

```typescript
// Profile management
GET /tenant/profile
PATCH /tenant/profile
Body: {
  name?: string,
  companyName?: string,
  companyRegistrationNumber?: string,
  businessAddress?: string,
  phone?: string
}

// Settings management
GET /tenant/settings
PATCH /tenant/settings
Body: {
  defaultCurrency?: string,
  timezone?: string
}

// KYC management
POST /tenant/kyc
Body: {
  companyName: string,
  companyRegistrationNumber: string,
  businessAddress: string,
  metadata?: object
}
GET /tenant/kyc/status
```

**Supported Currencies (ISO 4217):**

- NGN (Nigerian Naira)
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- KES (Kenyan Shilling)
- GHS (Ghanaian Cedi)
- ZAR (South African Rand)

**Timezone Validation:**

- Uses IANA timezone identifiers (e.g., "Africa/Lagos", "America/New_York")
- Validated using `Intl.DateTimeFormat`
- Examples: `Africa/Lagos`, `America/New_York`, `Europe/London`, `Asia/Dubai`

**KYC Status Flow:**

1. `pending` - KYC submitted, awaiting review
2. `approved` - KYC approved (cannot resubmit)
3. `rejected` - KYC rejected (can resubmit with new information)

## Request Flow

```
1. Request arrives
   ↓
2. CorrelationMiddleware (creates RequestContext)
   ↓
3. TenantMiddleware (extracts API key → validates → sets tenant in context)
   ↓
4. TenantGuard (validates tenant context exists)
   ↓
5. TenantContextInterceptor (sets RLS context: set_tenant_context())
   ↓
6. Controller/Service (can use @Tenant() decorator or RequestContext)
   ↓
7. Repository (automatically filters by tenant)
   ↓
8. Database (RLS policies enforce tenant isolation)
```

## Security Layers

### Layer 1: Application-Level

- **TenantMiddleware**: Extracts and validates tenant
- **TenantGuard**: Ensures tenant context exists
- **BaseRepository**: Manually filters queries by tenantId
- **RequestContext**: Stores tenant in AsyncLocalStorage

### Layer 2: Database-Level

- **RLS Policies**: Automatically filter all queries
- **set_tenant_context()**: Sets tenant context for RLS
- **Database enforcement**: Even if application code has bugs, database enforces isolation

## Example Usage

### Controller with Tenant

```typescript
import { Controller, Get } from '@nestjs/common';
import { Tenant, TenantId } from '@modules/tenant';
import { TenantEntity } from '@modules/tenant';

@Controller('api-keys')
export class ApiKeyController {
  @Get()
  async getApiKeys(@Tenant() tenant: TenantEntity) {
    // tenant automatically injected
    // All queries will be scoped to this tenant
    return this.apiKeyService.findAll();
  }
}
```

### Service with Automatic Tenant Context

```typescript
import { Injectable } from '@nestjs/common';
import { ApiKeyRepository } from '@modules/auth';

@Injectable()
export class ApiKeyService {
  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  async findAll() {
    // No need to pass tenantId - automatically uses RequestContext
    return this.apiKeyRepository.findAll();
  }
}
```

### Manual Tenant Access

```typescript
import { requireTenantId } from '@modules/tenant';

async someMethod() {
  const tenantId = requireTenantId();
  // Use tenantId...
}
```

## Configuration

### Public Endpoints (No Tenant Required)

The `TenantMiddleware` is excluded from health check endpoints. To add more:

```typescript
// In AppModule.configure()
consumer
  .apply(TenantMiddleware)
  .exclude(
    'health',
    'health/(.*)',
    'api/health',
    'api/health/(.*)',
    'public/(.*)', // Add your public routes
  )
  .forRoutes('*');
```

### Optional Tenant Endpoints

Use the `@OptionalTenant()` decorator:

```typescript
import { OptionalTenant } from '@modules/tenant/guards/tenant.guard';

@OptionalTenant()
@Get('public-data')
async getPublicData() {
  // Works with or without tenant
}
```

## Testing

When testing, you'll need to set tenant context:

```typescript
import { asyncLocalStorage } from '@common/logging/middleware/correlation.middleware';

asyncLocalStorage.run(
  {
    tenantId: 'test-tenant-id',
    correlationId: 'test-correlation-id',
    requestId: 'test-request-id',
    startTime: Date.now(),
  },
  async () => {
    // Your test code here
    // Tenant context is available
  },
);
```

## Notes

- **Connection Pooling**: Tenant context is set per database connection. With connection pooling, ensure you set context per request (handled automatically by TenantContextInterceptor).
- **Performance**: RLS policies add minimal overhead. Application-level filtering provides additional safety.
- **Admin Operations**: For system/admin operations that need to bypass tenant filtering, you can temporarily clear tenant context or use a service account with bypass policy.
