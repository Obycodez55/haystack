# Testing Guide

This guide covers the testing infrastructure, utilities, and best practices for the Haystack payment orchestration API.

## Table of Contents

- [Test Structure](#test-structure)
- [Test Utilities](#test-utilities)
- [Writing Unit Tests](#writing-unit-tests)
- [Writing E2E Tests](#writing-e2e-tests)
- [Running Tests](#running-tests)
- [Best Practices](#best-practices)

## Test Structure

The test directory is organized as follows:

```
test/
├── factories/          # Entity factories for creating test data
├── fixtures/           # Static test data fixtures
├── helpers/            # Test utilities and helpers
├── mocks/              # Mock implementations
├── setup/              # Global setup and teardown
└── utils/              # Shared utilities
```

## Test Utilities

### Factories

Factories provide a DRY way to create test entities with realistic data.

#### Tenant Factory

```typescript
import { TenantFactory } from '@test/factories';

// Build entity without saving
const tenant = TenantFactory.build({ name: 'Custom Name' });

// Create and save entity
const savedTenant = await TenantFactory.create({ email: 'test@example.com' });

// Create multiple tenants
const tenants = await TenantFactory.createMany(5);

// Create tenant with specific status
const activeTenant = TenantFactory.buildActive();
const suspendedTenant = TenantFactory.buildSuspended();
```

#### API Key Factory

```typescript
import { ApiKeyFactory } from '@test/factories';

// Create API key for a tenant
const apiKey = await ApiKeyFactory.create(tenantId);

// Create with valid key (for authentication tests)
const { entity, plaintextKey } =
  await ApiKeyFactory.createWithValidKey(tenantId);

// Create test or live mode keys
const testKey = await ApiKeyFactory.createTest(tenantId);
const liveKey = await ApiKeyFactory.createLive(tenantId);

// Create revoked or expired keys
const revokedKey = await ApiKeyFactory.createRevoked(tenantId);
const expiredKey = await ApiKeyFactory.createExpired(tenantId);
```

### Database Helpers

Database helpers manage test database connections and transactions.

```typescript
import { DatabaseHelper } from '@test/helpers';

// Setup database (usually in global setup)
await DatabaseHelper.setupTestDatabase();

// Run test in transaction (auto-rollback)
await DatabaseHelper.runInTransaction(async (queryRunner) => {
  const tenant = await TenantFactory.create();
  // Test code here
  // Transaction automatically rolls back
});

// Clear all data (for E2E tests)
await DatabaseHelper.clearDatabase();

// Get test DataSource
const dataSource = DatabaseHelper.getTestDataSource();
```

### Redis Helpers

Redis helpers manage test Redis connections and provide mocks.

```typescript
import { RedisHelper } from '@test/helpers';

// Setup Redis (usually in global setup)
await RedisHelper.setupTestRedis();

// Clear Redis
await RedisHelper.clearRedis();

// Create in-memory mock for unit tests
const mockRedis = RedisHelper.createMockRedis();
```

### Request Helpers

Request helpers simplify creating test applications and making HTTP requests.

```typescript
import { RequestHelper } from '@test/helpers';

// Create test app
const app = await RequestHelper.createTestApp();

// Create authenticated request
const request = RequestHelper.createAuthenticatedRequest(app, apiKey);

// Make request with common assertions
const response = await RequestHelper.makeRequest(app, 'get', '/api/endpoint', {
  headers: { Authorization: `Bearer ${apiKey}` },
  expectedStatus: 200,
});

// Assert response format
RequestHelper.expectSuccessResponse(response);
RequestHelper.expectErrorResponse(response, 'ERROR_CODE');
```

### Tenant Helpers

Tenant helpers manage tenant context in tests.

```typescript
import { TenantHelper } from '@test/helpers';

// Create test tenant with API key
const { tenant, apiKey, plaintextKey } = await TenantHelper.createTestTenant();

// Set tenant context
TenantHelper.setTenantContext(tenantId);

// Run function with tenant context
await TenantHelper.withTenantContext(tenantId, async () => {
  // Code that needs tenant context
});
```

## Writing Unit Tests

Unit tests should mock external dependencies and focus on testing individual components.

### Example: Repository Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { TenantEntity } from '@modules/tenant/entities/tenant.entity';
import { TenantFactory } from '@test/factories';

describe('TenantRepository', () => {
  let repository: TenantRepository;
  let mockRepository: jest.Mocked<Repository<TenantEntity>>;

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      // ... other methods
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantRepository,
        {
          provide: getRepositoryToken(TenantEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = module.get<TenantRepository>(TenantRepository);
  });

  it('should find tenant by id', async () => {
    const tenant = TenantFactory.build();
    mockRepository.findOne.mockResolvedValue(tenant);

    const result = await repository.findById(tenant.id, tenant.id);

    expect(result).toEqual(tenant);
    expect(mockRepository.findOne).toHaveBeenCalledWith({
      where: { id: tenant.id, tenantId: tenant.id },
    });
  });
});
```

### Example: Service Test with Mocks

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { RedisHelper } from '@test/helpers';
import { createMockLogger } from '@test/mocks';

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: any;

  beforeEach(async () => {
    mockRedis = RedisHelper.createMockRedis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: RedisService,
          useValue: { getClient: () => mockRedis },
        },
        {
          provide: LoggerService,
          useValue: createMockLogger(),
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('should get cached value', async () => {
    mockRedis.get.mockResolvedValue('cached-value');

    const result = await service.get('key');

    expect(result).toBe('cached-value');
    expect(mockRedis.get).toHaveBeenCalledWith('key');
  });
});
```

## Writing E2E Tests

E2E tests use real database and Redis connections, but run in isolated transactions.

### Example: E2E Test

```typescript
import { INestApplication } from '@nestjs/common';
import { RequestHelper, DatabaseHelper, TenantHelper } from '@test/helpers';
import { TenantFactory, ApiKeyFactory } from '@test/factories';

describe('Tenant API (e2e)', () => {
  let app: INestApplication;
  let tenantId: string;
  let apiKey: string;

  beforeAll(async () => {
    app = await RequestHelper.createTestApp();
    await DatabaseHelper.setupTestDatabase();

    // Create test tenant
    const { tenant, plaintextKey } = await TenantHelper.createTestTenant();
    tenantId = tenant.id;
    apiKey = plaintextKey;
  });

  afterAll(async () => {
    await app.close();
    await DatabaseHelper.teardownTestDatabase();
  });

  it('should get tenant profile', async () => {
    const response = await RequestHelper.createAuthenticatedRequest(app, apiKey)
      .get('/api/tenant/profile')
      .expect(200);

    RequestHelper.expectSuccessResponse(response);
    expect(response.body.data.id).toBe(tenantId);
  });

  it('should handle invalid API key', async () => {
    const response = await RequestHelper.createAuthenticatedRequest(
      app,
      'invalid-key',
    )
      .get('/api/tenant/profile')
      .expect(401);

    RequestHelper.expectErrorResponse(response, 'AUTHENTICATION_ERROR');
  });
});
```

### Using Transactions for Isolation

For faster E2E tests, use transactions that auto-rollback:

```typescript
it('should create tenant', async () => {
  await DatabaseHelper.runInTransaction(async (queryRunner) => {
    const tenantData = TenantFactory.build();

    const response = await RequestHelper.makeRequest(
      app,
      'post',
      '/api/tenants',
      {
        body: tenantData,
        expectedStatus: 201,
      },
    );

    // Transaction rolls back automatically
    // No cleanup needed!
  });
});
```

## Running Tests

### Local Testing

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run E2E tests
pnpm test:e2e

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov

# Debug tests
pnpm test:debug
```

### Docker Testing

```bash
# Run all tests in Docker
pnpm test:docker

# Run E2E tests in Docker
pnpm test:e2e:docker
```

### Test Database Setup

```bash
# Run migrations on test database
pnpm db:migrate:test

# Seed test data
pnpm db:seed:test

# Reset test database
pnpm db:reset:test
```

## Best Practices

### 1. Use Factories for Test Data

✅ **Good:**

```typescript
const tenant = await TenantFactory.create({ name: 'Test' });
```

❌ **Bad:**

```typescript
const tenant = new TenantEntity();
tenant.name = 'Test';
tenant.email = 'test@example.com';
// ... many more lines
await repository.save(tenant);
```

### 2. Use Transactions for E2E Tests

✅ **Good:**

```typescript
await DatabaseHelper.runInTransaction(async () => {
  // Test code
  // Auto-rollback, no cleanup needed
});
```

❌ **Bad:**

```typescript
// Create data
await TenantFactory.create();
// ... test code
// Manual cleanup
await DatabaseHelper.clearDatabase();
```

### 3. Mock External Dependencies in Unit Tests

✅ **Good:**

```typescript
const mockRedis = RedisHelper.createMockRedis();
```

❌ **Bad:**

```typescript
// Using real Redis in unit tests
await RedisHelper.setupTestRedis();
```

### 4. Use Helpers for Common Patterns

✅ **Good:**

```typescript
const { tenant, plaintextKey } = await TenantHelper.createTestTenant();
const request = RequestHelper.createAuthenticatedRequest(app, plaintextKey);
```

❌ **Bad:**

```typescript
// Manually creating tenant, API key, and request
```

### 5. Keep Tests Isolated

- Each test should be independent
- Use transactions or cleanup between tests
- Don't rely on test execution order

### 6. Test Error Cases

Always test both success and error scenarios:

```typescript
it('should handle missing tenant', async () => {
  const response = await request.get('/api/tenant/profile').expect(401);

  RequestHelper.expectErrorResponse(response);
});
```

### 7. Use Descriptive Test Names

✅ **Good:**

```typescript
it('should return 401 when API key is invalid', ...)
```

❌ **Bad:**

```typescript
it('should work', ...)
```

## Coverage

The project aims for:

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

Run `pnpm test:cov` to check coverage.

## Troubleshooting

### Database Connection Issues

If tests fail with database connection errors:

1. Ensure PostgreSQL is running
2. Check `DATABASE_NAME` is set to `haystack_test`
3. Verify database credentials in `.env.test`

### Redis Connection Issues

If tests fail with Redis connection errors:

1. Ensure Redis is running
2. Check `REDIS_DB` is set to `1` for tests
3. Verify Redis credentials in `.env.test`

### Migration Issues

If migrations fail:

1. Ensure test database exists
2. Run `pnpm db:migrate:test` manually
3. Check migration files are correct
