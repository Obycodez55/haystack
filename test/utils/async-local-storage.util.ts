import { asyncLocalStorage } from '@common/logging/middleware/correlation.middleware';
import { RequestContext } from '@common/logging/types/log-context.types';

/**
 * AsyncLocalStorage utilities for testing
 * Helpers for managing request context in tests
 */
export class AsyncLocalStorageUtil {
  /**
   * Run a function with a test context
   */
  static async runWithContext<T>(
    context: Partial<RequestContext>,
    fn: () => T | Promise<T>,
  ): Promise<T> {
    const fullContext: RequestContext = {
      correlationId: context.correlationId || 'test-correlation-id',
      requestId: context.requestId || 'test-request-id',
      startTime: context.startTime || Date.now(),
      tenantId: context.tenantId,
      userId: context.userId,
      userRole: context.userRole,
      apiKeyId: context.apiKeyId,
      ipAddress: context.ipAddress || '127.0.0.1',
      userAgent: context.userAgent || 'test-agent',
    };

    return asyncLocalStorage.run(fullContext, fn);
  }

  /**
   * Get current context
   */
  static getContext(): RequestContext | undefined {
    return asyncLocalStorage.getStore();
  }

  /**
   * Clear context (use with caution)
   */
  static clearContext(): void {
    // Note: AsyncLocalStorage doesn't have a direct clear method
    // Context is cleared when the async context ends
    // This is mainly for documentation
  }
}
