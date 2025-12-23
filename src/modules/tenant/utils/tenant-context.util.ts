import { getRequestContext } from '@common/logging/middleware/correlation.middleware';

/**
 * Get current tenant ID from request context
 */
export function getCurrentTenantId(): string | undefined {
  return getRequestContext()?.tenantId;
}

/**
 * Require tenant ID from request context
 * Throws error if tenant ID is not available
 */
export function requireTenantId(): string {
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    throw new Error('Tenant context is required but not available');
  }
  return tenantId;
}

