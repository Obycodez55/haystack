import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimit, RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';
import { RateLimitExceededError } from '../errors/rate-limit.error';
import { RateLimitConfig } from '../interfaces/rate-limit.interface';
import { RedisConfig } from '@config';
import { getRequestContext } from '@common/logging';
import { LoggerService } from '../../logging/services/logger.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('RateLimitGuard');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Skip if no API key (will be handled by auth guard)
    const apiKey = request.apiKey;
    if (!apiKey) {
      return true; // Let auth guard handle this
    }

    // Get rate limit config with priority:
    // 1. Method-level decorator (@RateLimit on method)
    // 2. Class-level decorator (@RateLimit on controller)
    // 3. Config file endpoint override
    // 4. Config file controller override
    // 5. Default based on mode (test/live)

    const methodConfig = this.reflector.get<RateLimitConfig>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    const classConfig = this.reflector.get<RateLimitConfig>(
      RATE_LIMIT_KEY,
      context.getClass(),
    );

    // Get controller and method names for config lookup
    const controllerName = context.getClass().name;
    const methodName = context.getHandler().name;
    const endpointKey = `${controllerName}.${methodName}`;

    // Get config file overrides
    const redisConfig = this.configService.get<RedisConfig>('redis');
    const endpointConfig = redisConfig?.rateLimit?.endpoints?.[endpointKey];
    const controllerConfig =
      redisConfig?.rateLimit?.controllers?.[controllerName];

    // Determine final config (priority order)
    const finalConfig = this.resolveConfig(
      methodConfig,
      classConfig,
      endpointConfig,
      controllerConfig,
      apiKey.mode || 'test',
      redisConfig,
    );

    // Skip if configured to skip
    if (finalConfig.skip) {
      return true;
    }

    // Extract tenant and mode
    const tenantId = request.tenant?.id || apiKey.tenantId;
    const mode = apiKey.mode || 'test';

    // Build identifier (can be customized)
    const identifier = finalConfig.identifier || `${tenantId}:${apiKey.id}`;

    // Check rate limit
    const result = await this.rateLimitService.checkRateLimit(
      identifier,
      mode,
      finalConfig,
    );

    // Set rate limit headers if enabled
    if (finalConfig.includeHeaders !== false) {
      response.setHeader('X-RateLimit-Limit', result.limit);
      response.setHeader('X-RateLimit-Remaining', result.remaining);
      response.setHeader(
        'X-RateLimit-Reset',
        new Date(result.reset).toISOString(),
      );

      if (!result.allowed) {
        response.setHeader('Retry-After', result.retryAfter.toString());
      }
    }

    if (!result.allowed) {
      // Log rate limit violation
      const requestContext = getRequestContext();
      this.logger.warn('Rate limit exceeded', {
        tenantId,
        apiKeyId: apiKey.id,
        mode,
        limit: result.limit,
        retryAfter: result.retryAfter,
        controller: controllerName,
        method: methodName,
        correlationId: requestContext?.correlationId,
      });

      const errorMessage =
        finalConfig.errorMessage ||
        `Rate limit exceeded. You can make ${result.limit} requests per ${finalConfig.window} seconds. Try again in ${result.retryAfter} seconds.`;

      throw new RateLimitExceededError({
        limit: result.limit,
        remaining: result.remaining,
        resetAt: new Date(result.reset),
        retryAfter: result.retryAfter,
        message: errorMessage,
      });
    }

    return true;
  }

  /**
   * Resolve rate limit config with priority order
   */
  private resolveConfig(
    methodConfig: RateLimitConfig | undefined,
    classConfig: RateLimitConfig | undefined,
    endpointConfig: RateLimitConfig | undefined,
    controllerConfig: RateLimitConfig | undefined,
    mode: 'test' | 'live',
    redisConfig: RedisConfig | undefined,
  ): RateLimitConfig {
    // Priority: method > class > endpoint > controller > default
    if (methodConfig) return methodConfig;
    if (classConfig) return classConfig;
    if (endpointConfig) return endpointConfig;
    if (controllerConfig) return controllerConfig;

    // Fall back to default for mode
    return (
      redisConfig?.rateLimit?.defaults?.[mode] || {
        requests: mode === 'live' ? 10000 : 100,
        window: 3600,
        includeHeaders: true,
      }
    );
  }
}
