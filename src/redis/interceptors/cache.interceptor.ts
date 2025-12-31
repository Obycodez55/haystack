import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../services/cache.service';
import {
  CACHE_KEY,
  CACHE_TTL,
  CACHE_NAMESPACE,
} from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    // Check if caching is enabled
    const cacheKey = this.reflector.get<string>(CACHE_KEY, handler);
    const cacheTtl = this.reflector.get<number>(CACHE_TTL, handler);
    const cacheNamespace = this.reflector.get<string>(CACHE_NAMESPACE, handler);

    if (!cacheKey) {
      return next.handle();
    }

    // Build cache key with request params
    const key = this.buildCacheKey(cacheKey, request, cacheNamespace);

    // Try cache first
    const cached = await this.cacheService.get(key, cacheNamespace);
    if (cached) {
      return of(cached);
    }

    // Execute handler and cache result
    return next.handle().pipe(
      tap(async (data) => {
        // Only cache successful responses
        if (data && !data.error) {
          await this.cacheService.set(key, data, {
            ttl: cacheTtl,
            namespace: cacheNamespace,
          });
        }
      }),
    );
  }

  private buildCacheKey(
    baseKey: string,
    request: any,
    namespace?: string,
  ): string {
    // Include tenant ID if available
    const tenantId = request.tenant?.id || request.user?.tenantId;

    // Include relevant params
    const params = {
      id: request.params?.id,
      ...request.query,
    };

    // Build key parts
    const parts = [baseKey];
    if (tenantId) parts.push(`tenant:${tenantId}`);
    if (params.id) parts.push(`id:${params.id}`);
    return parts.join(':');
  }
}
