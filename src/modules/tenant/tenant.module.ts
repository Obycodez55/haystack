import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantEntity } from './entities/tenant.entity';
import { TenantRepository } from './repositories/tenant.repository';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { TenantGuard } from './guards/tenant.guard';
import { TenantContextInterceptor } from './interceptors/tenant-context.interceptor';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantEntity]),
    forwardRef(() => AuthModule), // Use forwardRef to avoid circular dependency
  ],
  providers: [
    TenantRepository,
    TenantMiddleware,
    TenantGuard,
    TenantContextInterceptor,
  ],
  exports: [
    TenantRepository,
    TenantMiddleware,
    TenantGuard,
    TenantContextInterceptor,
    TypeOrmModule,
  ],
})
export class TenantModule {}
