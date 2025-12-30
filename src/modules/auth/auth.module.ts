import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyEntity } from './entities/api-key.entity';
import { ApiKeyRepository } from './repositories/api-key.repository';
import { TenantModule } from '../tenant/tenant.module';

const isOpenApiGeneration = process.env.GENERATE_OPENAPI === 'true';

@Module({
  imports: [
    ...(isOpenApiGeneration ? [] : [TypeOrmModule.forFeature([ApiKeyEntity])]),
    forwardRef(() => TenantModule), // Use forwardRef to avoid circular dependency
  ],
  providers: [
    ...(isOpenApiGeneration
      ? [
          {
            provide: ApiKeyRepository,
            useValue: {
              // Mock repository methods if needed
            },
          },
        ]
      : [ApiKeyRepository]),
  ],
  exports: [ApiKeyRepository, ...(isOpenApiGeneration ? [] : [TypeOrmModule])],
})
export class AuthModule {}
