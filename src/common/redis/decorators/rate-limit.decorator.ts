import { SetMetadata } from '@nestjs/common';
import { RateLimitConfig } from '../interfaces/rate-limit.interface';

export const RATE_LIMIT_KEY = 'rateLimit';
/**
 * Decorator to configure rate limiting for a route
 *
 * @example
 * @RateLimit({ requests: 100, window: 3600 }) // 100 requests per hour
 * @Get('payments')
 * async getPayments() { ... }
 */
export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_KEY, config);
