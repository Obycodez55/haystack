---
title: Database Setup Guide
---

# Database Setup Guide

This guide covers setting up PostgreSQL database for the Haystack Payment Orchestration Service.

## Prerequisites

- PostgreSQL 15 or higher
- Node.js 18+ with npm/pnpm

## Installation

### 1. Install PostgreSQL

**macOS:**

```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**

```bash
sudo apt-get update
sudo apt-get install postgresql-15
sudo systemctl start postgresql
```

**Docker:**

```bash
docker run --name haystack-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=haystack \
  -p 5432:5432 \
  -d postgres:15
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs:

- `@nestjs/typeorm` - NestJS TypeORM integration
- `typeorm` - TypeORM ORM
- `pg` - PostgreSQL driver
- `@types/pg` - TypeScript types

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Database Connection
DATABASE_URL=postgresql://user:password@localhost:5432/haystack
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=haystack

# SSL (for production)
DATABASE_SSL=false
DATABASE_SSL_REJECT_UNAUTHORIZED=true

# Connection Pool
DATABASE_MAX_CONNECTIONS=20
DATABASE_MIN_CONNECTIONS=5
DATABASE_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=10000
DATABASE_STATEMENT_TIMEOUT=30000
DATABASE_QUERY_TIMEOUT=30000
DATABASE_POOL_SIZE=10
DATABASE_ACQUIRE_TIMEOUT=60000

# Development
DATABASE_SYNCHRONIZE=false  # NEVER true in production
DATABASE_LOGGING=false
DATABASE_ENABLE_QUERY_LOGGING=false
```

## Database Setup

### 1. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE haystack;

# Create user (optional)
CREATE USER haystack_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE haystack TO haystack_user;
```

### 2. Run Migrations

```bash
# Generate migration (if needed)
pnpm migration:generate -- -n MigrationName

# Run migrations
pnpm migration:run

# Check migration status
pnpm migration:show

# Revert last migration (if needed)
pnpm migration:revert
```

## Architecture

### Module Structure

```
src/common/database/
├── database.module.ts       # TypeORM module configuration
├── database.service.ts      # Database health checks
├── entities/
│   ├── base.entity.ts      # Base entity with common fields
│   ├── tenant-scoped.entity.ts  # Base for tenant-scoped entities
│   ├── tenant.entity.ts     # Tenant entity
│   └── api-key.entity.ts   # API key entity
└── repositories/
    ├── base.repository.ts   # Base repository with tenant filtering
    ├── tenant.repository.ts # Tenant repository
    └── api-key.repository.ts # API key repository
```

### Multi-Tenancy

All tenant-scoped entities automatically filter queries by `tenant_id`. The `BaseRepository` ensures all queries are scoped to the current tenant.

**Example:**

```typescript
// Automatically filters by tenantId
const payments = await paymentRepository.findAll(tenantId);
```

## Usage Examples

### Using Repositories

```typescript
import { Injectable } from '@nestjs/common';
import { ApiKeyRepository } from '@common/database';

@Injectable()
export class PaymentService {
  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  async findApiKey(keyHash: string) {
    return this.apiKeyRepository.findByKeyHash(keyHash);
  }

  async getApiKeysForTenant(tenantId: string, mode: 'test' | 'live') {
    return this.apiKeyRepository.findActiveByTenantAndMode(tenantId, mode);
  }
}
```

### Health Checks

Database health is automatically checked at:

- `/health` - Full health check
- `/health/ready` - Readiness probe (includes database)

## Best Practices

1. **Never use `synchronize: true` in production** - Use migrations instead
2. **Always use transactions** for multi-step operations
3. **Use repositories** - Don't access TypeORM directly
4. **Filter by tenant** - Always include tenantId in queries
5. **Use indexes** - Defined in entity decorators
6. **Monitor connection pool** - Check `/health` endpoint

## Troubleshooting

### Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Check connection
psql -U postgres -d haystack -c "SELECT 1;"
```

### Migration Issues

```bash
# Check migration status
pnpm migration:show

# Revert if needed
pnpm migration:revert
```

## Production Considerations

1. **Use connection pooling** - Configured via `DATABASE_MAX_CONNECTIONS`
2. **Enable SSL** - Set `DATABASE_SSL=true` in production
3. **Monitor connections** - Use health check endpoint
4. **Backup regularly** - Set up automated backups
5. **Use read replicas** - For read-heavy workloads (future)
