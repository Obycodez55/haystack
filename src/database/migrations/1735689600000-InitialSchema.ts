import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1735689600000 implements MigrationInterface {
  name = 'InitialSchema1735689600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

    // Create tenants table
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "name" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "password_hash" VARCHAR(255) NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'active',
        "kyc_status" VARCHAR(50) NOT NULL DEFAULT 'pending',
        "kyc_submitted_at" TIMESTAMP,
        "kyc_approved_at" TIMESTAMP,
        "kyc_rejected_reason" TEXT,
        "company_name" VARCHAR(255),
        "company_registration_number" VARCHAR(100),
        "business_address" TEXT,
        "phone" VARCHAR(50),
        "default_currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
        "timezone" VARCHAR(50) NOT NULL DEFAULT 'Africa/Lagos',
        "metadata" JSONB,
        "deleted_at" TIMESTAMP,
        CONSTRAINT "CHK_tenants_status" CHECK ("status" IN ('active', 'suspended', 'deleted')),
        CONSTRAINT "CHK_tenants_kyc_status" CHECK ("kyc_status" IN ('pending', 'approved', 'rejected', 'not_required')),
        CONSTRAINT "PK_tenants" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for tenants table
    await queryRunner.query(`
      CREATE INDEX "idx_tenants_status" ON "tenants" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tenants_kyc_status" ON "tenants" ("kyc_status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tenants_created" ON "tenants" ("created_at")
    `);

    // Create api_keys table
    await queryRunner.query(`
      CREATE TABLE "api_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "tenant_id" uuid NOT NULL,
        "key_hash" VARCHAR(255) NOT NULL UNIQUE,
        "key_prefix" VARCHAR(20) NOT NULL,
        "name" VARCHAR(255),
        "mode" VARCHAR(10) NOT NULL,
        "last_used_at" TIMESTAMP,
        "last_used_ip" inet,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "revoked_at" TIMESTAMP,
        "revoked_reason" TEXT,
        "expires_at" TIMESTAMP,
        CONSTRAINT "CHK_api_keys_mode" CHECK ("mode" IN ('test', 'live')),
        CONSTRAINT "PK_api_keys" PRIMARY KEY ("id"),
        CONSTRAINT "FK_api_keys_tenant" FOREIGN KEY ("tenant_id") 
          REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for api_keys table
    await queryRunner.query(`
      CREATE INDEX "idx_api_keys_tenant" ON "api_keys" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_api_keys_tenant_mode" ON "api_keys" ("tenant_id", "mode")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_api_keys_active" ON "api_keys" ("is_active", "mode")
    `);

    // Create function to update updated_at timestamp
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for updated_at
    await queryRunner.query(`
      CREATE TRIGGER update_tenants_updated_at
      BEFORE UPDATE ON "tenants"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_api_keys_updated_at
      BEFORE UPDATE ON "api_keys"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_api_keys_updated_at ON "api_keys";
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_tenants_updated_at ON "tenants";
    `);

    // Drop function
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_updated_at_column();
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_api_keys_active";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_api_keys_tenant_mode";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_api_keys_tenant";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_tenants_created";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_tenants_kyc_status";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_tenants_status";
    `);

    // Drop tables (order matters due to foreign keys)
    await queryRunner.query(`
      DROP TABLE IF EXISTS "api_keys";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "tenants";
    `);

    // Note: We don't drop the uuid-ossp extension as it might be used by other databases
  }
}
