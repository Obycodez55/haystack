import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule, CorrelationMiddleware } from '@common';
import { TenantModule, TenantMiddleware, TenantGuard, TenantContextInterceptor } from '@modules';
import { AuthModule } from '@modules';

@Module({
  imports: [
    CommonModule,
    TenantModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Register TenantContextInterceptor globally
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
    // Register TenantGuard globally (can be overridden per route)
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply CorrelationMiddleware first (creates request context)
    consumer.apply(CorrelationMiddleware).forRoutes('*');
    
    // Apply TenantMiddleware second (populates tenant in context)
    // Skip for public endpoints (health checks, etc.)
    consumer
      .apply(TenantMiddleware)
      .exclude(
        'health',
        'health/(.*)',
        'api/health',
        'api/health/(.*)',
      )
      .forRoutes('*');
  }
}
