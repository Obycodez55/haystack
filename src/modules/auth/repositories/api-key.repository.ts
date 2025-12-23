import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyEntity, ApiKeyMode } from '../entities/api-key.entity';
import { BaseRepository } from '@common/database/repositories/base.repository';
import { LoggerService } from '@common';

@Injectable()
export class ApiKeyRepository extends BaseRepository<ApiKeyEntity> {
  constructor(
    @InjectRepository(ApiKeyEntity)
    repository: Repository<ApiKeyEntity>,
    logger: LoggerService,
  ) {
    super(repository, logger);
  }

  /**
   * Find API key by hash (not tenant-scoped, used for authentication)
   */
  async findByKeyHash(keyHash: string): Promise<ApiKeyEntity | null> {
    try {
      return this.repository.findOne({
        where: { keyHash, isActive: true },
        relations: ['tenant'],
      });
    } catch (error) {
      this.logger.error(
        'Failed to find API key by hash',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Find active API keys for tenant and mode
   */
  async findActiveByTenantAndMode(
    tenantId: string,
    mode: ApiKeyMode,
  ): Promise<ApiKeyEntity[]> {
    try {
      return this.repository.find({
        where: {
          tenantId,
          mode,
          isActive: true,
        },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to find active API keys', errorObj, {
        tenantId,
        mode,
      });
      throw error;
    }
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(
    id: string,
    tenantId: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      await this.repository.update(
        { id, tenantId } as any,
        {
          lastUsedAt: new Date(),
          lastUsedIp: ipAddress,
        },
      );
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to update last used', errorObj, {
        apiKeyId: id,
        tenantId,
      });
      throw error;
    }
  }
}

