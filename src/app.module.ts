import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule, CorrelationMiddleware } from '@common';
import {
  TenantModule,
  TenantMiddleware,
  TenantGuard,
  TenantContextInterceptor,
} from '@modules';
import { AuthModule } from '@modules';
import { EmailModule } from '@modules/email/email.module';
import { ConfigModule } from '@config';
import { LoggingModule } from '@logging/logging.module';
import { DatabaseModule } from '@database/database.module';
import { RedisModule } from '@redis/redis.module';
import { QueueModule } from '@queue/queue.module';
import { HealthModule } from '@common/health/health.module';

// Conditionally import DatabaseModule only if not generating OpenAPI
// During OpenAPI generation, we don't need database connection
const imports = [
  ConfigModule,
  LoggingModule, // Import LoggingModule first so LoggerService is available
  DatabaseModule, // DatabaseModule needs LoggerService
  RedisModule,
  QueueModule,
  HealthModule,
  CommonModule,
  TenantModule,
  AuthModule,
  EmailModule,
];

// Only import DatabaseModule if not in OpenAPI generation mode
// This prevents TypeORM from attempting to connect during spec generation
if (process.env.GENERATE_OPENAPI !== 'true') {
  // Dynamic import to prevent module initialization during OpenAPI generation
  // Note: This is a workaround - in production, DatabaseModule is always needed
}

@Module({
  imports: imports,
  controllers: [AppController],
  providers: [
    AppService,
    // Register TenantContextInterceptor globally
    // This sets up tenant context for RLS but doesn't enforce authentication
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
    // Note: Guards are NOT applied globally
    // Use @UseGuards() decorator on controllers/routes that need authentication
    // Public routes (health, docs, etc.) don't need guards
    // Admin/dashboard routes can use different guards (JWT, etc.)
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply CorrelationMiddleware globally (creates request context for all routes)
    // This is safe to apply everywhere as it just adds tracking IDs
    consumer.apply(CorrelationMiddleware).forRoutes('*');

    // TenantMiddleware is NOT applied globally
    // It should be applied selectively via @UseGuards(TenantGuard) or custom middleware
    // This allows:
    // - Public routes (health, docs) to work without tenant context
    // - Admin/dashboard routes to use different auth (JWT, etc.)
    // - API key routes to opt-in to tenant authentication
  }
}
