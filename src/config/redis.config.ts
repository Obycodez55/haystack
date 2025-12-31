import { registerAs } from '@nestjs/config';
import { RateLimitConfig } from '@common/redis/interfaces/rate-limit.interface';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  maxRetries: number;
  retryDelay: number;
  connectTimeout: number;
  commandTimeout: number;
  lazyConnect: boolean;
  keepAlive: number;
  defaultTtl: number;
  idempotencyTtl: number;
  lockTtl: number;
  cacheTtl: {
    payment: number;
    provider: number;
    tenant: number;
  };
  rateLimit: {
    defaults: {
      test: RateLimitConfig;
      live: RateLimitConfig;
    };
    endpoints?: Record<string, RateLimitConfig>;
    controllers?: Record<string, RateLimitConfig>;
  };
}

export default registerAs('redis', (): RedisConfig => {
  // Default rate limit configs
  const defaultRateLimitTest: RateLimitConfig = {
    requests: parseInt(process.env.REDIS_RATE_LIMIT_TEST_REQUESTS || '100', 10),
    window: parseInt(process.env.REDIS_RATE_LIMIT_TEST_WINDOW || '3600', 10),
    includeHeaders: true,
  };

  const defaultRateLimitLive: RateLimitConfig = {
    requests: parseInt(
      process.env.REDIS_RATE_LIMIT_LIVE_REQUESTS || '10000',
      10,
    ),
    window: parseInt(process.env.REDIS_RATE_LIMIT_LIVE_WINDOW || '3600', 10),
    includeHeaders: true,
  };

  // Use test Redis DB if NODE_ENV is test
  const isTest = process.env.NODE_ENV === 'test';
  const defaultDb = isTest ? 1 : 0;

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || String(defaultDb), 10),
    keyPrefix:
      process.env.REDIS_KEY_PREFIX || (isTest ? 'haystack_test:' : 'haystack:'),
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10),
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
    commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10),
    lazyConnect: process.env.REDIS_LAZY_CONNECT === 'true',
    keepAlive: parseInt(process.env.REDIS_KEEP_ALIVE || '30000', 10),
    defaultTtl: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10),
    idempotencyTtl: parseInt(process.env.REDIS_IDEMPOTENCY_TTL || '86400', 10),
    lockTtl: parseInt(process.env.REDIS_LOCK_TTL || '30', 10),
    cacheTtl: {
      payment: parseInt(process.env.REDIS_CACHE_TTL_PAYMENT || '300', 10),
      provider: parseInt(process.env.REDIS_CACHE_TTL_PROVIDER || '60', 10),
      tenant: parseInt(process.env.REDIS_CACHE_TTL_TENANT || '900', 10),
    },
    rateLimit: {
      defaults: {
        test: defaultRateLimitTest,
        live: defaultRateLimitLive,
      },
      // Can be extended via environment variables or config files
      endpoints: {},
      controllers: {},
    },
  };
});
