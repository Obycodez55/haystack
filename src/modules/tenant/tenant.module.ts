import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { TenantEntity } from './entities/tenant.entity';
import { TenantRepository } from './repositories/tenant.repository';
import { TenantService } from './services/tenant.service';
import { TenantController } from './controllers/tenant.controller';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { TenantGuard } from './guards/tenant.guard';
import { TenantContextInterceptor } from './interceptors/tenant-context.interceptor';
import { AuthModule } from '../auth/auth.module';

const isOpenApiGeneration = process.env.GENERATE_OPENAPI === 'true';

@Module({
  imports: [
    ...(isOpenApiGeneration ? [] : [TypeOrmModule.forFeature([TenantEntity])]),
    forwardRef(() => AuthModule), // Use forwardRef to avoid circular dependency
  ],
  controllers: [TenantController],
  providers: [
    ...(isOpenApiGeneration
      ? [
          // Provide mock DataSource for OpenAPI generation
          {
            provide: getDataSourceToken(),
            useValue: null,
          },
          {
            provide: TenantRepository,
            useValue: {
              // Mock repository methods if needed
            },
          },
        ]
      : [TenantRepository, TenantService]),
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
    ...(isOpenApiGeneration ? [] : [TypeOrmModule]),
  ],
})
export class TenantModule {}
