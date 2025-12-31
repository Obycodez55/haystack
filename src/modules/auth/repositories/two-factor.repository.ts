import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TwoFactorEntity } from '../entities/two-factor.entity';
import { BaseRepository } from '@database/repositories/base.repository';
import { LoggerService } from '@logging/services/logger.service';
import { toError } from '@common/utils/error.util';

@Injectable()
export class TwoFactorRepository extends BaseRepository<TwoFactorEntity> {
  constructor(
    @InjectRepository(TwoFactorEntity)
    repository: Repository<TwoFactorEntity>,
    logger: LoggerService,
  ) {
    super(repository, logger);
  }

  /**
   * Find 2FA settings by tenant ID
   */
  async findByTenantId(tenantId: string): Promise<TwoFactorEntity | null> {
    try {
      return this.repository.findOne({
        where: { tenantId } as any,
        relations: ['tenant'],
      });
    } catch (error) {
      this.logger.error('Failed to find 2FA by tenant ID', toError(error), {
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Check if 2FA is enabled for tenant
   */
  async isEnabled(tenantId: string): Promise<boolean> {
    try {
      const twoFactor = await this.findByTenantId(tenantId);
      return twoFactor?.isEnabled ?? false;
    } catch (error) {
      this.logger.error('Failed to check 2FA status', toError(error), {
        tenantId,
      });
      return false;
    }
  }

  /**
   * Update last verified timestamp
   */
  async updateLastVerified(tenantId: string): Promise<void> {
    try {
      await this.repository.update({ tenantId } as any, {
        lastVerifiedAt: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to update last verified', toError(error), {
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Increment backup codes used count
   */
  async incrementBackupCodesUsed(tenantId: string): Promise<void> {
    try {
      await this.repository
        .createQueryBuilder()
        .update(TwoFactorEntity)
        .set({
          backupCodesUsed: () => 'backup_codes_used + 1',
        })
        .where('tenant_id = :tenantId', { tenantId })
        .execute();
    } catch (error) {
      this.logger.error(
        'Failed to increment backup codes used',
        toError(error),
        { tenantId },
      );
      throw error;
    }
  }
}
