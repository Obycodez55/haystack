import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TenantEntity } from './entities/tenant.entity';
import { TenantRepository } from './repositories/tenant.repository';
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
      : [TenantRepository]),
    TenantMiddleware,
    TenantGuard,
    TenantContextInterceptor,
  ],
  exports: [
    TenantRepository,
    TenantMiddleware,
    TenantGuard,
    TenantContextInterceptor,
    ...(isOpenApiGeneration ? [] : [TypeOrmModule]),
  ],
})
export class TenantModule {}
