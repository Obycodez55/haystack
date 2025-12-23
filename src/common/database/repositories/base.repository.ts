import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Repository,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
  DeepPartial,
  UpdateResult,
  DeleteResult,
  QueryDeepPartialEntity,
} from 'typeorm';
import { TenantScopedEntity } from '../entities/base.entity';
import { LoggerService } from '@common';

/**
 * Base repository with automatic tenant filtering
 * All queries are automatically scoped to tenant
 */
@Injectable()
export abstract class BaseRepository<T extends TenantScopedEntity> {
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly logger: LoggerService,
  ) {}

  /**
   * Get tenant filter for queries
   */
  protected getTenantFilter(tenantId: string): FindOptionsWhere<T> {
    return { tenantId } as FindOptionsWhere<T>;
  }

  /**
   * Find entity by ID and tenant
   */
  async findById(id: string, tenantId: string): Promise<T | null> {
    try {
      return this.repository.findOne({
        where: { id, tenantId } as FindOptionsWhere<T>,
      });
    } catch (error) {
      this.logger.error(
        'Failed to find entity by ID',
        error instanceof Error ? error : new Error(String(error)),
        { entityId: id, tenantId },
      );
      throw error;
    }
  }

  /**
   * Find entity by ID and tenant or throw
   */
  async findByIdOrFail(id: string, tenantId: string): Promise<T> {
    const entity = await this.findById(id, tenantId);
    if (!entity) {
      throw new NotFoundException(`Entity with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Find all entities for tenant
   */
  async findAll(
    tenantId: string,
    options?: FindManyOptions<T>,
  ): Promise<T[]> {
    try {
      return this.repository.find({
        ...options,
        where: {
          ...options?.where,
          ...this.getTenantFilter(tenantId),
        } as FindOptionsWhere<T>,
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to find all entities', errorObj, {
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Find one entity for tenant
   */
  async findOne(
    tenantId: string,
    options?: FindOneOptions<T>,
  ): Promise<T | null> {
    try {
      return this.repository.findOne({
        ...options,
        where: {
          ...options?.where,
          ...this.getTenantFilter(tenantId),
        } as FindOptionsWhere<T>,
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to find one entity', errorObj, {
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Create new entity
   */
  async create(entity: DeepPartial<T>, tenantId: string): Promise<T> {
    try {
      const newEntity = this.repository.create({
        ...entity,
        tenantId,
      } as T);
      return this.repository.save(newEntity);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to create entity', errorObj, {
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Update entity
   */
  async update(
    id: string,
    tenantId: string,
    updates: DeepPartial<T>,
  ): Promise<T> {
    try {
      await this.repository.update(
        { id, tenantId } as FindOptionsWhere<T>,
        updates as QueryDeepPartialEntity<T>,
      );
      return this.findByIdOrFail(id, tenantId);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to update entity', errorObj, {
        entityId: id,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Delete entity
   */
  async delete(id: string, tenantId: string): Promise<DeleteResult> {
    try {
      return this.repository.delete({ id, tenantId } as FindOptionsWhere<T>);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to delete entity', errorObj, {
        entityId: id,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Count entities for tenant
   */
  async count(tenantId: string, options?: FindManyOptions<T>): Promise<number> {
    try {
      return this.repository.count({
        ...options,
        where: {
          ...options?.where,
          ...this.getTenantFilter(tenantId),
        } as FindOptionsWhere<T>,
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to count entities', errorObj, {
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Check if entity exists
   */
  async exists(id: string, tenantId: string): Promise<boolean> {
    try {
      const count = await this.repository.count({
        where: { id, tenantId } as FindOptionsWhere<T>,
      });
      return count > 0;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to check entity existence', errorObj, {
        entityId: id,
        tenantId,
      });
      throw error;
    }
  }
}

