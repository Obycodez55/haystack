import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1767362280191 implements MigrationInterface {
  name = 'InitialSchema1767362280191';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tenants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "email_verified_at" TIMESTAMP, "status" character varying(50) NOT NULL DEFAULT 'active', "kyc_status" character varying(50) NOT NULL DEFAULT 'pending', "kyc_submitted_at" TIMESTAMP, "kyc_approved_at" TIMESTAMP, "kyc_rejected_reason" text, "company_name" character varying(255), "company_registration_number" character varying(100), "business_address" text, "phone" character varying(50), "default_currency" character varying(3) NOT NULL DEFAULT 'NGN', "timezone" character varying(50) NOT NULL DEFAULT 'Africa/Lagos', "metadata" jsonb, "deleted_at" TIMESTAMP, CONSTRAINT "UQ_155c343439adc83ada6ee3f48be" UNIQUE ("email"), CONSTRAINT "CHK_00b650f1d9e7b6f4b3fd36d28c" CHECK ("kyc_status" IN ('pending', 'approved', 'rejected', 'not_required')), CONSTRAINT "CHK_3ec2d8e15232e39c06fb998ea9" CHECK ("status" IN ('active', 'suspended', 'deleted')), CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tenants_created" ON "tenants" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tenants_kyc_status" ON "tenants" ("kyc_status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tenants_status" ON "tenants" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "email_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "messageId" character varying(255) NOT NULL, "provider" character varying(100) NOT NULL, "to" character varying(255) NOT NULL, "cc" character varying(255), "bcc" character varying(255), "subject" character varying(500) NOT NULL, "template" character varying(100), "status" character varying(50) NOT NULL, "error" text, "errorCode" character varying(50), "retryable" boolean NOT NULL DEFAULT false, "attemptCount" integer NOT NULL DEFAULT '0', "metadata" jsonb, "tags" character varying(255), "sentAt" TIMESTAMP, "openedAt" TIMESTAMP, "clickedAt" TIMESTAMP, CONSTRAINT "PK_999382218924e953a790d340571" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fb1f1d051d1e51c28841ef17e9" ON "email_logs" ("messageId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a46f2afa3d5822fe2f1c111ce3" ON "email_logs" ("tenant_id", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a0c24c98c8a145726ccfd63f04" ON "email_logs" ("tenant_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "two_factor_auth" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "secret" character varying(255) NOT NULL, "is_enabled" boolean NOT NULL DEFAULT false, "enabled_at" TIMESTAMP, "backup_codes" jsonb, "backup_codes_used" integer NOT NULL DEFAULT '0', "last_verified_at" TIMESTAMP, CONSTRAINT "PK_ac930594b4dbe3771cf16cd108d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_two_factor_enabled" ON "two_factor_auth" ("tenant_id", "is_enabled") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_two_factor_tenant" ON "two_factor_auth" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "key_hash" character varying(255) NOT NULL, "key_prefix" character varying(20) NOT NULL, "name" character varying(255), "mode" character varying(10) NOT NULL, "last_used_at" TIMESTAMP, "last_used_ip" inet, "is_active" boolean NOT NULL DEFAULT true, "revoked_at" TIMESTAMP, "revoked_reason" text, "expires_at" TIMESTAMP, CONSTRAINT "UQ_57384430aa1959f4578046c9b81" UNIQUE ("key_hash"), CONSTRAINT "CHK_e0ce090c9e5fb88ca1ac1d27a7" CHECK ("mode" IN ('test', 'live')), CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_api_keys_active" ON "api_keys" ("is_active", "mode") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_api_keys_tenant_mode" ON "api_keys" ("tenant_id", "mode") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_api_keys_tenant" ON "api_keys" ("tenant_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD CONSTRAINT "FK_7abbd4fdeb1501e538727e191f0" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD CONSTRAINT "FK_3ac18429c8d27858d79432e0dda" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP CONSTRAINT "FK_3ac18429c8d27858d79432e0dda"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP CONSTRAINT "FK_7abbd4fdeb1501e538727e191f0"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_api_keys_tenant"`);
    await queryRunner.query(`DROP INDEX "public"."idx_api_keys_tenant_mode"`);
    await queryRunner.query(`DROP INDEX "public"."idx_api_keys_active"`);
    await queryRunner.query(`DROP TABLE "api_keys"`);
    await queryRunner.query(`DROP INDEX "public"."idx_two_factor_tenant"`);
    await queryRunner.query(`DROP INDEX "public"."idx_two_factor_enabled"`);
    await queryRunner.query(`DROP TABLE "two_factor_auth"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a0c24c98c8a145726ccfd63f04"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a46f2afa3d5822fe2f1c111ce3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fb1f1d051d1e51c28841ef17e9"`,
    );
    await queryRunner.query(`DROP TABLE "email_logs"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tenants_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tenants_kyc_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tenants_created"`);
    await queryRunner.query(`DROP TABLE "tenants"`);
  }
}
