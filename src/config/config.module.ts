import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validationSchema } from './validation.schema';
import appConfig from './app.config';
import databaseConfig from './database.config';
import redisConfig from './redis.config';
import loggingConfig from './logging.config';
import jwtConfig from './jwt.config';

/**
 * Global configuration module
 * Provides validated configuration for all services
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema,
      validationOptions: {
        allowUnknown: true, // Allow extra env vars (useful for development)
        abortEarly: true, // Stop on first error (fail fast for required vars)
      },
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        loggingConfig,
        jwtConfig,
      ],
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}

