import * as Joi from 'joi';

/**
 * Joi validation schema for environment variables
 */
export const validationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),
  APP_NAME: Joi.string().default('haystack'),
  APP_VERSION: Joi.string().default('0.0.1'),
  PORT: Joi.number().default(3000),
  API_VERSION: Joi.string().default('v1'),
  GLOBAL_PREFIX: Joi.string().default('api'),

  // Database
  DATABASE_URL: Joi.string().optional(),
  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USERNAME: Joi.string().default('postgres'),
  DATABASE_PASSWORD: Joi.string().default('postgres'),
  DATABASE_NAME: Joi.string().default('haystack'),
  DATABASE_SSL: Joi.string().valid('true', 'false').default('false'),
  DATABASE_SSL_REJECT_UNAUTHORIZED: Joi.string()
    .valid('true', 'false')
    .optional(),
  DATABASE_SSL_CA: Joi.string().optional(),
  DATABASE_SSL_CERT: Joi.string().optional(),
  DATABASE_SSL_KEY: Joi.string().optional(),
  DATABASE_MAX_CONNECTIONS: Joi.number().default(20),
  DATABASE_MIN_CONNECTIONS: Joi.number().default(5),
  DATABASE_IDLE_TIMEOUT: Joi.number().default(30000),
  DATABASE_CONNECTION_TIMEOUT: Joi.number().default(10000),
  DATABASE_STATEMENT_TIMEOUT: Joi.number().default(30000),
  DATABASE_QUERY_TIMEOUT: Joi.number().default(30000),
  DATABASE_POOL_SIZE: Joi.number().default(10),
  DATABASE_ACQUIRE_TIMEOUT: Joi.number().default(60000),
  DATABASE_SYNCHRONIZE: Joi.string().valid('true', 'false').default('false'),
  DATABASE_LOGGING: Joi.string().optional(),
  DATABASE_ENABLE_QUERY_LOGGING: Joi.string()
    .valid('true', 'false')
    .default('false'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().default(0),
  REDIS_KEY_PREFIX: Joi.string().default('haystack:'),
  REDIS_MAX_RETRIES: Joi.number().default(3),
  REDIS_RETRY_DELAY: Joi.number().default(1000),
  REDIS_CONNECT_TIMEOUT: Joi.number().default(10000),
  REDIS_COMMAND_TIMEOUT: Joi.number().default(5000),
  REDIS_LAZY_CONNECT: Joi.string().valid('true', 'false').default('false'),
  REDIS_KEEP_ALIVE: Joi.number().default(30000),
  REDIS_DEFAULT_TTL: Joi.number().default(3600),
  REDIS_IDEMPOTENCY_TTL: Joi.number().default(86400),
  REDIS_LOCK_TTL: Joi.number().default(30),
  REDIS_CACHE_TTL_PAYMENT: Joi.number().default(300),
  REDIS_CACHE_TTL_PROVIDER: Joi.number().default(60),
  REDIS_CACHE_TTL_TENANT: Joi.number().default(900),
  REDIS_RATE_LIMIT_TEST_REQUESTS: Joi.number().default(100),
  REDIS_RATE_LIMIT_TEST_WINDOW: Joi.number().default(3600),
  REDIS_RATE_LIMIT_LIVE_REQUESTS: Joi.number().default(10000),
  REDIS_RATE_LIMIT_LIVE_WINDOW: Joi.number().default(3600),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
  LOG_PRETTY: Joi.string().valid('true', 'false').optional(),
  LOG_FILE_ENABLED: Joi.string().valid('true', 'false').default('false'),
  LOG_DIR: Joi.string().default('logs'),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Encryption (for provider credentials)
  ENCRYPTION_KEY: Joi.string().optional(),

  // Docker/Test flags
  AUTO_MIGRATE: Joi.string().valid('true', 'false').optional(),
  WAIT_FOR_DB: Joi.string().valid('true', 'false').optional(),
  WAIT_FOR_REDIS: Joi.string().valid('true', 'false').optional(),
});
