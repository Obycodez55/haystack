import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@config';
import { LoggingModule } from './logging/logging.module';
import { HealthModule } from './health/health.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { VersionGuard } from './guards/version.guard';
import { LoggerService } from './logging/services/logger.service';

/**
 * Global Common Module
 * Registers all common services and utilities:
 * - Configuration (with validation)
 * - Logging (structured logging with Pino)
 * - Health checks
 * - Error handling (exception filters)
 * - Response transformation (interceptors)
 * - API versioning (guards)
 * 
 * This module should be imported in AppModule
 */
@Global()
@Module({
  imports: [ConfigModule, LoggingModule, HealthModule],
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
    // Global API version guard (optional - can be applied per route)
    // Uncomment if you want versioning on all routes
    // {
    //   provide: APP_GUARD,
    //   useClass: VersionGuard,
    // },
  ],
  exports: [ConfigModule, LoggingModule, HealthModule],
})
export class CommonModule {}

