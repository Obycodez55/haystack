import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyEntity, ApiKeyMode } from '../entities/api-key.entity';
import { BaseRepository } from '@common/database/repositories/base.repository';
import { LoggerService } from '@common';
import { compareApiKey } from '../utils/api-key-hash.util';

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
   * Find API key by prefix (for efficient lookup before comparing)
   * API keys have format: sk_test_xxx or sk_live_xxx
   */
  async findByKeyPrefix(keyPrefix: string): Promise<ApiKeyEntity[]> {
    try {
      return this.repository.find({
        where: { keyPrefix, isActive: true },
        relations: ['tenant'],
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to find API keys by prefix', errorObj, {
        keyPrefix,
      });
      throw error;
    }
  }

  /**
   * Validate API key by comparing plaintext with stored hash
   * Returns the API key entity if valid, null otherwise
   */
  async validateApiKey(plaintextKey: string): Promise<ApiKeyEntity | null> {
    try {
      // Extract prefix from key (e.g., "sk_test_" or "sk_live_")
      const prefixMatch = plaintextKey.match(/^(sk|pk)_(test|live)_/);
      if (!prefixMatch) {
        return null;
      }

      const keyPrefix = prefixMatch[0];
      
      // Find all active API keys with this prefix
      const candidates = await this.findByKeyPrefix(keyPrefix);
      
      if (candidates.length === 0) {
        return null;
      }

      // Compare plaintext key with each candidate's hash
      for (const candidate of candidates) {
        const isValid = await compareApiKey(plaintextKey, candidate.keyHash);
        if (isValid) {
          return candidate;
        }
      }

      return null;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to validate API key', errorObj);
      return null;
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

