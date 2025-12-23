import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis.service';
import { LoggerService } from '@common';
import {
  RateLimitConfig,
  RateLimitResult,
} from '../interfaces/rate-limit.interface';
import { buildRateLimitKey } from '../utils/key-builder.util';
import { calculateResetTime } from '../utils/window-calculator.util';
import { RedisConfig } from '@config';

@Injectable()
export class RateLimitService {
  private readonly defaultLimits: Map<string, RateLimitConfig> = new Map([
    ['test', { requests: 100, window: 3600 }], // 100/hour
    ['live', { requests: 10000, window: 3600 }], // 10k/hour
  ]);

  constructor(
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('RateLimitService');

    // Load defaults from config
    const redisConfig = this.configService.get<RedisConfig>('redis');
    if (redisConfig?.rateLimit?.defaults) {
      this.defaultLimits.set('test', redisConfig.rateLimit.defaults.test);
      this.defaultLimits.set('live', redisConfig.rateLimit.defaults.live);
    }
  }

  /**
   * Check and increment rate limit for a key
   * Returns rate limit status and headers
   */
  async checkRateLimit(
    identifier: string,
    mode: 'test' | 'live',
    customLimit?: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const config =
      customLimit ||
      this.defaultLimits.get(mode) ||
      this.defaultLimits.get('test')!;
    const now = Date.now();
    const windowMs = config.window * 1000;
    const windowStart = now - windowMs;

    // Build Redis key
    const key = buildRateLimitKey(identifier, mode, config.window);

    try {
      // Use sorted set to track requests in sliding window
      // Score = timestamp, Value = unique request ID
      const pipeline = this.redis.client.pipeline();

      // Remove old entries outside window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Add current request
      const requestId = `${now}-${Math.random()}`;
      pipeline.zadd(key, now, requestId);

      // Set expiration (window + buffer)
      pipeline.expire(key, config.window + 60);

      // Count requests in window
      pipeline.zcard(key);

      // Execute pipeline
      const results = await pipeline.exec();

      if (!results) {
        throw new Error('Redis pipeline execution failed');
      }

      const requestCount = results[results.length - 1][1] as number;
      const remaining = Math.max(0, config.requests - requestCount);
      const resetTime = calculateResetTime(now, config.window);

      const isLimited = requestCount > config.requests;

      // Log if approaching limit
      if (requestCount > config.requests * 0.8) {
        this.logger.warn('Rate limit approaching', {
          identifier,
          mode,
          requests: requestCount,
          limit: config.requests,
        });
      }

      return {
        allowed: !isLimited,
        limit: config.requests,
        remaining,
        reset: resetTime,
        retryAfter: isLimited ? Math.ceil((resetTime - now) / 1000) : 0,
      };
    } catch (error) {
      // Graceful degradation: allow request if Redis fails
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Rate limit check failed, allowing request', errorObj, {
        identifier,
        mode,
      });

      // Fallback: allow request but log warning
      return {
        allowed: true,
        limit: config.requests,
        remaining: config.requests,
        reset: Date.now() + windowMs,
        retryAfter: 0,
        fallback: true, // Indicates fallback mode
      };
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getRateLimitStatus(
    identifier: string,
    mode: 'test' | 'live',
    customLimit?: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const config =
      customLimit ||
      this.defaultLimits.get(mode) ||
      this.defaultLimits.get('test')!;
    const now = Date.now();
    const windowMs = config.window * 1000;
    const windowStart = now - windowMs;
    const key = buildRateLimitKey(identifier, mode, config.window);

    try {
      // Remove old entries
      await this.redis.client.zremrangebyscore(key, 0, windowStart);

      // Count current requests
      const requestCount = await this.redis.client.zcard(key);
      const remaining = Math.max(0, config.requests - requestCount);
      const resetTime = calculateResetTime(now, config.window);

      return {
        allowed: requestCount <= config.requests,
        limit: config.requests,
        remaining,
        reset: resetTime,
        retryAfter:
          requestCount > config.requests
            ? Math.ceil((resetTime - now) / 1000)
            : 0,
      };
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Rate limit status check failed', errorObj, {
        identifier,
      });

      return {
        allowed: true,
        limit: config.requests,
        remaining: config.requests,
        reset: Date.now() + windowMs,
        retryAfter: 0,
        fallback: true,
      };
    }
  }

  /**
   * Reset rate limit for a key (admin function)
   */
  async resetRateLimit(
    identifier: string,
    mode: 'test' | 'live',
  ): Promise<void> {
    const config =
      this.defaultLimits.get(mode) || this.defaultLimits.get('test')!;
    const key = buildRateLimitKey(identifier, mode, config.window);

    try {
      await this.redis.client.del(key);
      this.logger.log('Rate limit reset', { identifier, mode });
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to reset rate limit', errorObj, {
        identifier,
      });
      throw error;
    }
  }
}
