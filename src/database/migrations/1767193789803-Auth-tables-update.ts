import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthTablesUpdate1767193789803 implements MigrationInterface {
  name = 'AuthTablesUpdate1767193789803';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP CONSTRAINT "FK_api_keys_tenant"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_tenants_created"`);
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT "CHK_tenants_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT "CHK_tenants_kyc_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP CONSTRAINT "CHK_api_keys_mode"`,
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
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "created_at"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "created_at"`);
    await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "updated_at"`);
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tenants_created" ON "tenants" ("createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "CHK_00b650f1d9e7b6f4b3fd36d28c" CHECK ("kyc_status" IN ('pending', 'approved', 'rejected', 'not_required'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "CHK_3ec2d8e15232e39c06fb998ea9" CHECK ("status" IN ('active', 'suspended', 'deleted'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD CONSTRAINT "CHK_e0ce090c9e5fb88ca1ac1d27a7" CHECK ("mode" IN ('test', 'live'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD CONSTRAINT "FK_3ac18429c8d27858d79432e0dda" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD CONSTRAINT "FK_7abbd4fdeb1501e538727e191f0" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP CONSTRAINT "FK_7abbd4fdeb1501e538727e191f0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP CONSTRAINT "FK_3ac18429c8d27858d79432e0dda"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP CONSTRAINT "CHK_e0ce090c9e5fb88ca1ac1d27a7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT "CHK_3ec2d8e15232e39c06fb998ea9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT "CHK_00b650f1d9e7b6f4b3fd36d28c"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_tenants_created"`);
    await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "createdAt"`);
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
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
    await queryRunner.query(`DROP INDEX "public"."idx_two_factor_tenant"`);
    await queryRunner.query(`DROP INDEX "public"."idx_two_factor_enabled"`);
    await queryRunner.query(`DROP TABLE "two_factor_auth"`);
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD CONSTRAINT "CHK_api_keys_mode" CHECK (((mode)::text = ANY ((ARRAY['test'::character varying, 'live'::character varying])::text[])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "CHK_tenants_kyc_status" CHECK (((kyc_status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'not_required'::character varying])::text[])))`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "CHK_tenants_status" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'deleted'::character varying])::text[])))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tenants_created" ON "tenants" ("created_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD CONSTRAINT "FK_api_keys_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
