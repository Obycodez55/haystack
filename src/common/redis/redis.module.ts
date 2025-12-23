import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';
import { RateLimitService } from './services/rate-limit.service';
import { CacheService } from './services/cache.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { CacheInterceptor } from './interceptors/cache.interceptor';
import { CacheInvalidateInterceptor } from './interceptors/cache-invalidate.interceptor';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    RedisService,
    RateLimitService,
    CacheService,
    RateLimitGuard,
    CacheInterceptor,
    CacheInvalidateInterceptor,
    // Register rate limit guard globally
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    // Register cache interceptors globally
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInvalidateInterceptor,
    },
  ],
  exports: [RedisService, RateLimitService, CacheService],
})
export class RedisModule {}

