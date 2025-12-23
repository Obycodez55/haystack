import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import { DataSource } from 'typeorm';
import { getRequestContext } from '@common/logging/middleware/correlation.middleware';
import { LoggerService } from '@common';

/**
 * Tenant context interceptor
 * Automatically sets tenant context for RLS policies before each request
 * This ensures database-level row-level security is enforced
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('TenantContextInterceptor');
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const requestContext = getRequestContext();
    const tenantId = requestContext?.tenantId;

    if (tenantId) {
      try {
        // Set tenant context for RLS policies
        // This must be called before any database queries
        await this.dataSource.query('SELECT set_tenant_context($1)', [tenantId]);
        this.logger.debug('Tenant context set for RLS', { tenantId });
      } catch (error) {
        this.logger.error('Failed to set tenant context for RLS', error, {
          tenantId,
        });
        // Don't fail the request, but log the error
        // Application-level filtering will still work
      }
    }

    return next.handle().pipe(
      finalize(() => {
        // Optionally clear tenant context after request
        // Note: This might not be necessary with connection pooling
        // but can be useful for debugging
        if (tenantId) {
          // Use void to explicitly mark promise as intentionally not awaited
          // This prevents unhandled promise rejection warnings
          void this.dataSource
            .query('SELECT set_tenant_context(NULL)')
            .catch((error) => {
              // Silently ignore errors when clearing tenant context
              // This is cleanup code and shouldn't affect request handling
              this.logger.debug('Failed to clear tenant context (non-critical)', error);
            });
        }
      }),
    );
  }
}

