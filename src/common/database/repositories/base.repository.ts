import { Injectable, NotFoundException } from '@nestjs/common';
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
import {
  getCurrentTenantId,
  requireTenantId,
} from '@modules/tenant/utils/tenant-context.util';

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
   * If tenantId is not provided, uses tenant from request context
   */
  async findById(id: string, tenantId?: string): Promise<T | null> {
    const effectiveTenantId = tenantId || requireTenantId();
    try {
      return this.repository.findOne({
        where: { id, tenantId: effectiveTenantId } as FindOptionsWhere<T>,
      });
    } catch (error) {
      this.logger.error(
        'Failed to find entity by ID',
        error instanceof Error ? error : new Error(String(error)),
        { entityId: id, tenantId: effectiveTenantId },
      );
      throw error;
    }
  }

  /**
   * Find entity by ID and tenant or throw
   * If tenantId is not provided, uses tenant from request context
   */
  async findByIdOrFail(id: string, tenantId?: string): Promise<T> {
    const entity = await this.findById(id, tenantId);
    if (!entity) {
      throw new NotFoundException(`Entity with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Find all entities for tenant
   * If tenantId is not provided, uses tenant from request context
   */
  async findAll(tenantId?: string, options?: FindManyOptions<T>): Promise<T[]> {
    const effectiveTenantId = tenantId || requireTenantId();
    try {
      return this.repository.find({
        ...options,
        where: {
          ...options?.where,
          ...this.getTenantFilter(effectiveTenantId),
        } as FindOptionsWhere<T>,
      });
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to find all entities', errorObj, {
        tenantId: effectiveTenantId,
      });
      throw error;
    }
  }

  /**
   * Find one entity for tenant
   * If tenantId is not provided, uses tenant from request context
   */
  async findOne(
    tenantId?: string,
    options?: FindOneOptions<T>,
  ): Promise<T | null> {
    const effectiveTenantId = tenantId || requireTenantId();
    try {
      return this.repository.findOne({
        ...options,
        where: {
          ...options?.where,
          ...this.getTenantFilter(effectiveTenantId),
        } as FindOptionsWhere<T>,
      });
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to find one entity', errorObj, {
        tenantId: effectiveTenantId,
      });
      throw error;
    }
  }

  /**
   * Create new entity
   * If tenantId is not provided, uses tenant from request context
   */
  async create(entity: DeepPartial<T>, tenantId?: string): Promise<T> {
    const effectiveTenantId = tenantId || requireTenantId();
    try {
      const newEntity = this.repository.create({
        ...entity,
        tenantId: effectiveTenantId,
      } as T);
      return this.repository.save(newEntity);
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to create entity', errorObj, {
        tenantId: effectiveTenantId,
      });
      throw error;
    }
  }

  /**
   * Update entity
   * If tenantId is not provided, uses tenant from request context
   */
  async update(
    id: string,
    tenantId: string | undefined,
    updates: DeepPartial<T>,
  ): Promise<T> {
    const effectiveTenantId = tenantId || requireTenantId();
    try {
      await this.repository.update(
        { id, tenantId: effectiveTenantId } as FindOptionsWhere<T>,
        updates as QueryDeepPartialEntity<T>,
      );
      return this.findByIdOrFail(id, effectiveTenantId);
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to update entity', errorObj, {
        entityId: id,
        tenantId: effectiveTenantId,
      });
      throw error;
    }
  }

  /**
   * Delete entity
   * If tenantId is not provided, uses tenant from request context
   */
  async delete(id: string, tenantId?: string): Promise<DeleteResult> {
    const effectiveTenantId = tenantId || requireTenantId();
    try {
      return this.repository.delete({
        id,
        tenantId: effectiveTenantId,
      } as FindOptionsWhere<T>);
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to delete entity', errorObj, {
        entityId: id,
        tenantId: effectiveTenantId,
      });
      throw error;
    }
  }

  /**
   * Count entities for tenant
   * If tenantId is not provided, uses tenant from request context
   */
  async count(
    tenantId?: string,
    options?: FindManyOptions<T>,
  ): Promise<number> {
    const effectiveTenantId = tenantId || requireTenantId();
    try {
      return this.repository.count({
        ...options,
        where: {
          ...options?.where,
          ...this.getTenantFilter(effectiveTenantId),
        } as FindOptionsWhere<T>,
      });
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to count entities', errorObj, {
        tenantId: effectiveTenantId,
      });
      throw error;
    }
  }

  /**
   * Check if entity exists
   * If tenantId is not provided, uses tenant from request context
   */
  async exists(id: string, tenantId?: string): Promise<boolean> {
    const effectiveTenantId = tenantId || requireTenantId();
    try {
      const count = await this.repository.count({
        where: { id, tenantId: effectiveTenantId } as FindOptionsWhere<T>,
      });
      return count > 0;
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to check entity existence', errorObj, {
        entityId: id,
        tenantId: effectiveTenantId,
      });
      throw error;
    }
  }
}
