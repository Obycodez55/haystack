import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../services/cache.service';
import {
  CACHE_INVALIDATE_PATTERN,
  CacheInvalidateOptions,
} from '../decorators/cache.decorator';
import { LoggerService } from '../../logging/services/logger.service';

@Injectable()
export class CacheInvalidateInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('CacheInvalidateInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    // Get cache invalidation config
    const invalidateConfig = this.reflector.get<CacheInvalidateOptions>(
      CACHE_INVALIDATE_PATTERN,
      handler,
    );

    if (!invalidateConfig) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (data) => {
        // Only invalidate on success
        if (data && !data.error) {
          await this.invalidateCache(invalidateConfig, request);
        }
      }),
    );
  }

  private async invalidateCache(
    config: CacheInvalidateOptions,
    request: any,
  ): Promise<void> {
    const { pattern, namespace, tags, async: isAsync } = config;

    const invalidation = async () => {
      // Invalidate by pattern
      if (pattern) {
        // Replace placeholders with actual values
        const resolvedPattern = this.resolvePattern(pattern, request);
        await this.cacheService.invalidate(resolvedPattern, namespace);
      }

      // Invalidate by tags
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          const resolvedTag = this.resolvePattern(tag, request);
          await this.cacheService.invalidateByTag(resolvedTag);
        }
      }
    };

    if (isAsync) {
      // Fire and forget
      invalidation().catch((error) => {
        const errorObj =
          error instanceof Error ? error : new Error(String(error));
        this.logger.error('Async cache invalidation failed', errorObj, {
          config,
        });
      });
    } else {
      await invalidation();
    }
  }

  private resolvePattern(pattern: string, request: any): string {
    // Replace {id} with actual param value
    return pattern
      .replace(/{id}/g, request.params?.id || '')
      .replace(/{tenantId}/g, request.tenant?.id || '')
      .replace(/{apiKeyId}/g, request.apiKey?.id || '');
  }
}
