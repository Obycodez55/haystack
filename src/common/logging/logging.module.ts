import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './services/logger.service';
import { CorrelationMiddleware } from './middleware/correlation.middleware';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

/**
 * Logging module
 * Provides structured logging service and correlation middleware
 * Note: Not global - imported by CommonModule
 */
@Module({
  providers: [
    {
      provide: LoggerService,
      useFactory: (configService: ConfigService) => {
        const logger = new LoggerService(configService);
        logger.setContext('Haystack');
        return logger;
      },
      inject: [ConfigService],
    },
    CorrelationMiddleware,
    // Optionally enable global request logging interceptor
    // Uncomment if you want automatic request/response logging
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: LoggingInterceptor,
    // },
  ],
  exports: [LoggerService, CorrelationMiddleware],
})
export class LoggingModule {}

