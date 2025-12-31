import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@config';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { LoggerService } from '@logging/services/logger.service';

/**
 * Global Common Module
 * Registers common services and utilities:
 * - Configuration (with validation)
 * - Health checks
 * - Error handling (exception filters)
 * - Response transformation (interceptors)
 *
 * Note: Database, Redis, Queue, and Logging modules are imported directly in AppModule
 * This module only handles shared utilities and filters.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    // Note: LoggingModule, DatabaseModule, RedisModule, QueueModule, and HealthModule
    // are now imported directly in AppModule
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
    // Note: Other modules are exported directly from their own modules
  ],
})
export class CommonModule {}
