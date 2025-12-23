---
title: Migrations Guide
---

# Database Migrations Guide

This guide explains how to work with TypeORM migrations in the Haystack Payment Orchestration Service.

## Overview

Migrations are used to manage database schema changes in a version-controlled, reversible way.

## Migration Commands

### Generate Migration

```bash
# Generate a new migration
pnpm migration:generate -- -n MigrationName

# Example: Add a new column
pnpm migration:generate -- -n AddPaymentMethodToPayments
```

### Run Migrations

```bash
# Run all pending migrations
pnpm migration:run

# Check migration status
pnpm migration:show
```

### Revert Migration

```bash
# Revert the last migration
pnpm migration:revert
```

## Migration File Structure

Migrations are located in `src/database/migrations/`:

```
src/database/migrations/
├── 1700000000000-InitialSchema.ts
├── 1700000001000-AddPaymentMethod.ts
└── ...
```

### Example Migration

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentMethod1700000001000 implements MigrationInterface {
  name = 'AddPaymentMethod1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments
      ADD COLUMN payment_method VARCHAR(50);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_payments_method 
      ON payments(payment_method);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_payments_method;
    `);

    await queryRunner.query(`
      ALTER TABLE payments
      DROP COLUMN payment_method;
    `);
  }
}
```

## Best Practices

1. **Always include down migration** - For reversibility
2. **Test migrations on staging first** - Never test on production
3. **One logical change per migration** - Easier to review and revert
4. **Use transactions** - Wrap migrations in transactions when possible
5. **Never modify existing migrations** - Create new ones instead
6. **Document breaking changes** - Add comments for complex migrations

## Migration Workflow

### Development

1. Make changes to entities
2. Generate migration: `pnpm migration:generate -- -n Description`
3. Review generated migration
4. Test migration: `pnpm migration:run`
5. Test revert: `pnpm migration:revert`
6. Commit migration file

### Production

1. Backup database
2. Run migrations: `pnpm migration:run`
3. Monitor for errors
4. Verify application health
5. Rollback if needed: `pnpm migration:revert`

## Common Patterns

### Adding a Column

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`
    ALTER TABLE payments
    ADD COLUMN new_column VARCHAR(255);
  `);
}

public async down(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`
    ALTER TABLE payments
    DROP COLUMN new_column;
  `);
}
```

### Adding an Index

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`
    CREATE INDEX idx_payments_status_created
    ON payments(status, created_at DESC);
  `);
}

public async down(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`
    DROP INDEX IF EXISTS idx_payments_status_created;
  `);
}
```

### Adding a Foreign Key

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`
    ALTER TABLE payments
    ADD CONSTRAINT fk_payments_tenant
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE;
  `);
}

public async down(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`
    ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS fk_payments_tenant;
  `);
}
```

## Troubleshooting

### Migration Fails

1. Check database connection
2. Verify migration syntax
3. Check for conflicting migrations
4. Review error message carefully

### Migration Already Applied

```bash
# Check migration status
pnpm migration:show

# If needed, manually mark as applied (not recommended)
# Better to fix the migration and rerun
```

### Rollback Issues

1. Ensure down migration is correct
2. Check for data dependencies
3. Verify foreign key constraints
4. Test rollback on staging first

