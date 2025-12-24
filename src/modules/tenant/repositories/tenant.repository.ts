import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { TenantEntity } from '../entities/tenant.entity';
import { LoggerService } from '../../../common/logging/services/logger.service';

@Injectable()
export class TenantRepository {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly repository: Repository<TenantEntity>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('TenantRepository');
  }

  /**
   * Find tenant by ID
   */
  async findById(id: string): Promise<TenantEntity | null> {
    try {
      return this.repository.findOne({
        where: { id } as FindOptionsWhere<TenantEntity>,
      });
    } catch (error) {
      this.logger.error(
        'Failed to find tenant by ID',
        error instanceof Error ? error : new Error(String(error)),
        { tenantId: id },
      );
      throw error;
    }
  }

  /**
   * Find tenant by email (not tenant-scoped)
   */
  async findByEmail(email: string): Promise<TenantEntity | null> {
    try {
      return this.repository.findOne({
        where: { email },
      });
    } catch (error) {
      this.logger.error(
        'Failed to find tenant by email',
        error instanceof Error ? error : new Error(String(error)),
        { email },
      );
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      const count = await this.repository.count({
        where: { email },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        'Failed to check email existence',
        error instanceof Error ? error : new Error(String(error)),
        { email },
      );
      throw error;
    }
  }

  /**
   * Create tenant
   */
  async create(entity: Partial<TenantEntity>): Promise<TenantEntity> {
    try {
      const newEntity = this.repository.create(entity);
      return this.repository.save(newEntity);
    } catch (error) {
      this.logger.error(
        'Failed to create tenant',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Update tenant
   */
  async update(
    id: string,
    updates: Partial<TenantEntity>,
  ): Promise<TenantEntity> {
    try {
      await this.repository.update(
        { id } as FindOptionsWhere<TenantEntity>,
        updates,
      );
      const updated = await this.findById(id);
      if (!updated) {
        throw new Error(`Tenant with ID ${id} not found`);
      }
      return updated;
    } catch (error) {
      this.logger.error(
        'Failed to update tenant',
        error instanceof Error ? error : new Error(String(error)),
        { tenantId: id },
      );
      throw error;
    }
  }
}
