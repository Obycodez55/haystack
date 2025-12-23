import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyEntity } from './entities/api-key.entity';
import { ApiKeyRepository } from './repositories/api-key.repository';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKeyEntity]),
    forwardRef(() => TenantModule), // Use forwardRef to avoid circular dependency
  ],
  providers: [ApiKeyRepository],
  exports: [ApiKeyRepository, TypeOrmModule],
})
export class AuthModule {}

