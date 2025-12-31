import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { getRequestContext } from '@logging/middleware/correlation.middleware';

/**
 * Tenant decorator
 * Extracts tenant from request context
 * Usage: @Tenant() tenant: TenantEntity
 */
export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();

    // First try to get from request object (set by TenantMiddleware)
    const tenant = (request as any).tenant;
    if (tenant) {
      return tenant;
    }

    // Fallback to request context
    const requestContext = getRequestContext();
    if (requestContext?.tenantId) {
      // Return tenant ID if entity not available
      return { id: requestContext.tenantId };
    }

    return null;
  },
);

/**
 * Tenant ID decorator
 * Extracts tenant ID from request context
 * Usage: @TenantId() tenantId: string
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();

    // First try to get from request object
    const tenant = (request as any).tenant;
    if (tenant?.id) {
      return tenant.id;
    }

    // Fallback to request context
    const requestContext = getRequestContext();
    return requestContext?.tenantId || null;
  },
);
