import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add Row Level Security (RLS) policies for multi-tenancy
 * This ensures database-level security where tenants can only access their own data
 */
export class AddRowLevelSecurity1767362280192 implements MigrationInterface {
  name = 'AddRowLevelSecurity1767362280192';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable Row Level Security on tenant-scoped tables
    await queryRunner.query(`
      ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
    `);

    await queryRunner.query(`
      ALTER TABLE "two_factor_auth" ENABLE ROW LEVEL SECURITY;
    `);

    await queryRunner.query(`
      ALTER TABLE "email_logs" ENABLE ROW LEVEL SECURITY;
    `);

    // Create function to set tenant context (for application use)
    // This function sets a session variable that RLS policies can read
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid uuid)
      RETURNS void AS $$
      BEGIN
        PERFORM set_config('app.current_tenant_id', tenant_uuid::text, false);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Create function to get current tenant ID
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION get_current_tenant_id()
      RETURNS uuid AS $$
      BEGIN
        RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);

    // RLS Policy for api_keys table
    // Tenants can only see their own API keys
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_api_keys"
      ON "api_keys"
      FOR ALL
      USING (tenant_id = get_current_tenant_id())
      WITH CHECK (tenant_id = get_current_tenant_id());
    `);

    // RLS Policy for two_factor_auth table
    // Tenants can only see their own 2FA records
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_two_factor_auth"
      ON "two_factor_auth"
      FOR ALL
      USING (tenant_id = get_current_tenant_id())
      WITH CHECK (tenant_id = get_current_tenant_id());
    `);

    // RLS Policy for email_logs table
    // Tenants can only see their own email logs
    await queryRunner.query(`
      CREATE POLICY "tenant_isolation_email_logs"
      ON "email_logs"
      FOR ALL
      USING (tenant_id = get_current_tenant_id())
      WITH CHECK (tenant_id = get_current_tenant_id());
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop RLS policies
    await queryRunner.query(`
      DROP POLICY IF EXISTS "tenant_isolation_email_logs" ON "email_logs";
    `);

    await queryRunner.query(`
      DROP POLICY IF EXISTS "tenant_isolation_two_factor_auth" ON "two_factor_auth";
    `);

    await queryRunner.query(`
      DROP POLICY IF EXISTS "tenant_isolation_api_keys" ON "api_keys";
    `);

    // Drop functions
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS get_current_tenant_id();
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS set_tenant_context(uuid);
    `);

    // Disable RLS (optional - policies are already dropped)
    await queryRunner.query(`
      ALTER TABLE "email_logs" DISABLE ROW LEVEL SECURITY;
    `);

    await queryRunner.query(`
      ALTER TABLE "two_factor_auth" DISABLE ROW LEVEL SECURITY;
    `);

    await queryRunner.query(`
      ALTER TABLE "api_keys" DISABLE ROW LEVEL SECURITY;
    `);
  }
}
