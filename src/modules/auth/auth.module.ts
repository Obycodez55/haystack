import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyEntity } from './entities/api-key.entity';
import { ApiKeyRepository } from './repositories/api-key.repository';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKeyEntity]),
    TenantModule, // Import tenant module for entity reference
  ],
  providers: [ApiKeyRepository],
  exports: [ApiKeyRepository, TypeOrmModule],
})
export class AuthModule {}

