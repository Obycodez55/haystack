import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmFeatureModule } from '@common/openapi';
import { TenantEntity } from './entities/tenant.entity';
import { TenantRepository } from './repositories/tenant.repository';
import { TenantService } from './services/tenant.service';
import { TenantController } from './controllers/tenant.controller';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { TenantGuard } from './guards/tenant.guard';
import { TenantContextInterceptor } from './interceptors/tenant-context.interceptor';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmFeatureModule([TenantEntity]),
    forwardRef(() => AuthModule), // Use forwardRef to avoid circular dependency
  ],
  controllers: [TenantController],
  providers: [
    TenantRepository,
    TenantService,
    TenantMiddleware,
    TenantGuard,
    TenantContextInterceptor,
  ],
  exports: [
    TenantRepository,
    TenantService,
    TenantMiddleware,
    TenantGuard,
    TenantContextInterceptor,
  ],
})
export class TenantModule {}
