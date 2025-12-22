import * as Joi from 'joi';

/**
 * Joi validation schema for environment variables
 * Currently validates: app, logging
 * TODO: Add database, redis, jwt, encryption when implementing those features
 */
export const validationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production')
    .default('development'),
  APP_NAME: Joi.string().default('haystack'),
  APP_VERSION: Joi.string().default('0.0.1'),
  PORT: Joi.number().default(3000),
  API_VERSION: Joi.string().default('v1'),
  GLOBAL_PREFIX: Joi.string().default('api'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
  LOG_PRETTY: Joi.string().valid('true', 'false').optional(),
  LOG_FILE_ENABLED: Joi.string().valid('true', 'false').default('false'),
  LOG_DIR: Joi.string().default('logs'),

  // TODO: Add when implementing features
  // Database
  // DATABASE_URL: Joi.string().optional(),
  // DATABASE_HOST: Joi.string().default('localhost'),
  // DATABASE_PORT: Joi.number().default(5432),
  // DATABASE_USERNAME: Joi.string().default('postgres'),
  // DATABASE_PASSWORD: Joi.string().default('postgres'),
  // DATABASE_NAME: Joi.string().default('haystack'),
  // DATABASE_SSL: Joi.string().valid('true', 'false').default('false'),
  // DATABASE_MAX_CONNECTIONS: Joi.number().default(10),
  // DATABASE_CONNECTION_TIMEOUT: Joi.number().default(30000),

  // Redis
  // REDIS_HOST: Joi.string().default('localhost'),
  // REDIS_PORT: Joi.number().default(6379),
  // REDIS_PASSWORD: Joi.string().optional(),
  // REDIS_DB: Joi.number().default(0),
  // REDIS_TTL: Joi.number().default(3600),
  // REDIS_MAX_RETRIES: Joi.number().default(3),
  // REDIS_RETRY_DELAY: Joi.number().default(1000),

  // JWT
  // JWT_SECRET: Joi.string().required(),
  // JWT_EXPIRES_IN: Joi.string().default('15m'),
  // JWT_REFRESH_SECRET: Joi.string().required(),
  // JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Encryption (for provider credentials)
  // ENCRYPTION_KEY: Joi.string().optional(),
});

