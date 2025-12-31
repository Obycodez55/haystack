import { asyncLocalStorage } from '@common/logging/middleware/correlation.middleware';
import { RequestContext } from '@common/logging/types/log-context.types';
import { TenantEntity } from '@modules/tenant/entities/tenant.entity';
import { ApiKeyEntity } from '@modules/auth/entities/api-key.entity';
import { DataSource } from 'typeorm';
import { TenantFactory, ApiKeyFactory } from '../factories';
import { DatabaseHelper } from './database.helper';

/**
 * Tenant testing utilities
 * Provides helpers for managing tenant context in tests
 */
export class TenantHelper {
  /**
   * Create a test tenant with an API key
   * Returns both the tenant and API key for use in tests
   */
  static async createTestTenant(overrides?: {
    tenant?: Partial<TenantEntity>;
    apiKey?: Partial<ApiKeyEntity>;
  }): Promise<{
    tenant: TenantEntity;
    apiKey: ApiKeyEntity;
    plaintextKey: string;
  }> {
    const dataSource = DatabaseHelper.getTestDataSource();

    // Set DataSource for factories
    TenantFactory.setDataSource(dataSource);
    ApiKeyFactory.setDataSource(dataSource);

    // Create tenant
    const tenant = await TenantFactory.create(overrides?.tenant);

    // Create API key with valid key
    const { entity: apiKey, plaintextKey } =
      await ApiKeyFactory.createWithValidKey(tenant.id, overrides?.apiKey);

    return { tenant, apiKey, plaintextKey };
  }

  /**
   * Set tenant context in AsyncLocalStorage
   * Useful for testing code that relies on RequestContext
   */
  static setTenantContext(
    tenantId: string,
    additionalContext?: Partial<RequestContext>,
  ): void {
    const context: RequestContext = {
      correlationId: 'test-correlation-id',
      requestId: 'test-request-id',
      startTime: Date.now(),
      tenantId,
      ...additionalContext,
    };

    // Note: asyncLocalStorage.run() requires a callback, so we need to use it differently
    // For tests, we'll provide a helper that wraps the test function
    (asyncLocalStorage as any).enterWith(context);
  }

  /**
   * Clear tenant context from AsyncLocalStorage
   */
  static clearTenantContext(): void {
    (asyncLocalStorage as any).exit();
  }

  /**
   * Run a function with tenant context set
   * Automatically clears context after execution
   */
  static async withTenantContext<T>(
    tenantId: string,
    fn: () => Promise<T>,
    additionalContext?: Partial<RequestContext>,
  ): Promise<T> {
    const context: RequestContext = {
      correlationId: 'test-correlation-id',
      requestId: 'test-request-id',
      startTime: Date.now(),
      tenantId,
      ...additionalContext,
    };

    return asyncLocalStorage.run(context, async () => {
      try {
        return await fn();
      } finally {
        // Context is automatically cleared when run() completes
      }
    });
  }

  /**
   * Get current tenant ID from context
   */
  static getCurrentTenantId(): string | undefined {
    return asyncLocalStorage.getStore()?.tenantId;
  }
}
