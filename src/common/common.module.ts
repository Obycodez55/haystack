import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@config';
import { LoggingModule } from './logging/logging.module';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { LoggerService } from './logging/services/logger.service';

/**
 * Global Common Module
 * Registers all common services and utilities:
 * - Configuration (with validation)
 * - Logging (structured logging with Pino)
 * - Database (TypeORM with PostgreSQL)
 * - Redis (caching, rate limiting)
 * - Health checks
 * - Error handling (exception filters)
 * - Response transformation (interceptors)
 * - API versioning (guards)
 *
 * This module should be imported in AppModule
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    LoggingModule, // Import LoggingModule first so LoggerService is available
    DatabaseModule, // DatabaseModule needs LoggerService
    RedisModule,
    HealthModule,
  ],
  providers: [
    // Global exception filter with proper dependency injection
    {
      provide: APP_FILTER,
      useFactory: (logger: LoggerService) => {
        return new HttpExceptionFilter(logger);
      },
      inject: [LoggerService],
    },
    // Global response interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
  exports: [
    ConfigModule,
    LoggingModule,
    DatabaseModule,
    RedisModule,
    HealthModule,
  ],
})
export class CommonModule {}
