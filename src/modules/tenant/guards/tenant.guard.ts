import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { getRequestContext } from '@logging/middleware/correlation.middleware';
import { AuthenticationError } from '@common/errors/authentication.error';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';

/**
 * Metadata key for optional tenant requirement
 */
export const IS_TENANT_OPTIONAL = 'isTenantOptional';

/**
 * Decorator to mark endpoint as optionally requiring tenant
 * Use this for endpoints that work with or without tenant context
 */
export const OptionalTenant = () => {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    const reflector = new Reflector();
    Reflect.defineMetadata(
      IS_TENANT_OPTIONAL,
      true,
      descriptor?.value || target,
    );
  };
};

/**
 * Tenant guard
 * Ensures tenant context is available for protected endpoints
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Public routes don't need tenant authentication
    if (isPublic) {
      return true;
    }

    const isOptional = this.reflector.getAllAndOverride<boolean>(
      IS_TENANT_OPTIONAL,
      [context.getHandler(), context.getClass()],
    );

    // Check if tenant is set on request (from TenantMiddleware)
    const tenant = (request as any).tenant;
    const requestContext = getRequestContext();
    const tenantId = tenant?.id || requestContext?.tenantId;

    if (!tenantId) {
      if (isOptional) {
        // Allow request to proceed without tenant
        return true;
      }

      // Tenant is required but not found
      throw AuthenticationError.missingApiKey();
    }

    // Validate tenant is active
    if (tenant && tenant.status !== 'active') {
      throw new UnauthorizedException(
        `Tenant account is ${tenant.status}. Please contact support.`,
      );
    }

    return true;
  }
}
