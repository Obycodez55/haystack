import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add Row Level Security (RLS) policies for multi-tenancy
 * This ensures database-level security where tenants can only access their own data
 */
export class AddRowLevelSecurity1735689601000 implements MigrationInterface {
  name = 'AddRowLevelSecurity1735689601000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable Row Level Security on api_keys table
    await queryRunner.query(`
      ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
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
        RETURN current_setting('app.current_tenant_id', true)::uuid;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create policy for api_keys: tenants can only see their own API keys
    // This policy uses the session variable set by set_tenant_context()
    await queryRunner.query(`
      CREATE POLICY "api_keys_tenant_isolation" ON "api_keys"
      FOR ALL
      USING (
        tenant_id = get_current_tenant_id() 
        OR get_current_tenant_id() IS NULL  -- Allow queries when tenant context not set (for admin operations)
      );
    `);

    // Grant execute permissions
    await queryRunner.query(`
      GRANT EXECUTE ON FUNCTION set_tenant_context(uuid) TO PUBLIC;
      GRANT EXECUTE ON FUNCTION get_current_tenant_id() TO PUBLIC;
    `);

    // Add comment explaining RLS usage
    await queryRunner.query(`
      COMMENT ON POLICY "api_keys_tenant_isolation" ON "api_keys" IS 
      'Enforces tenant isolation at database level. Application must call set_tenant_context(tenant_id) before querying.';
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION set_tenant_context(uuid) IS 
      'Sets the current tenant context for RLS policies. Call this at the start of each request with the authenticated tenant ID.';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop policies
    await queryRunner.query(`
      DROP POLICY IF EXISTS "api_keys_service_account_bypass" ON "api_keys";
    `);

    await queryRunner.query(`
      DROP POLICY IF EXISTS "api_keys_tenant_isolation" ON "api_keys";
    `);

    // Drop functions
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS get_current_tenant_id();
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS set_tenant_context(uuid);
    `);

    // Disable RLS
    await queryRunner.query(`
      ALTER TABLE "api_keys" DISABLE ROW LEVEL SECURITY;
    `);
  }
}

