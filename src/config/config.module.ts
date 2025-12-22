import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validationSchema } from './validation.schema';
import appConfig from './app.config';
import loggingConfig from './logging.config';
// TODO: Load these when we implement the features
// import databaseConfig from './database.config';
// import redisConfig from './redis.config';
// import jwtConfig from './jwt.config';

/**
 * Global configuration module
 * Provides validated configuration for all services
 * Currently loads: app, logging
 * TODO: Add database, redis, jwt when implementing those features
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
      load: [
        appConfig,
        loggingConfig,
        // TODO: Add when implementing features
        // databaseConfig,
        // redisConfig,
        // jwtConfig,
      ],
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}

