import { DeepPartial } from 'typeorm';
import {
  ApiKeyEntity,
  ApiKeyMode,
} from '@modules/auth/entities/api-key.entity';
import { DataSource } from 'typeorm';
import { hashApiKey } from '@modules/auth/utils/api-key-hash.util';
import { getFaker } from './faker-helper';

/**
 * API Key factory for creating test API key entities
 * Follows factory pattern for DRY test data creation
 */
export class ApiKeyFactory {
  private static dataSource: DataSource | null = null;

  /**
   * Set the DataSource for saving entities
   */
  static setDataSource(dataSource: DataSource): void {
    this.dataSource = dataSource;
  }

  /**
   * Generate a valid API key string
   */
  static async generateApiKey(
    mode: ApiKeyMode = ApiKeyMode.TEST,
  ): Promise<string> {
    const f = await getFaker();
    const prefix = mode === ApiKeyMode.TEST ? 'sk_test' : 'sk_live';
    const randomPart = f.string.alphanumeric(32);
    return `${prefix}_${randomPart}`;
  }

  /**
   * Build an API key entity without saving to database
   */
  static async build(
    tenantId: string,
    overrides?: DeepPartial<ApiKeyEntity>,
  ): Promise<ApiKeyEntity> {
    const mode = overrides?.mode || ApiKeyMode.TEST;
    const apiKey = await this.generateApiKey(mode);
    const keyPrefix = apiKey.substring(
      0,
      apiKey.indexOf('_', apiKey.indexOf('_') + 1) + 1,
    );

    const entity = new ApiKeyEntity();
    entity.tenantId = tenantId;
    entity.keyHash = overrides?.keyHash || (await hashApiKey(apiKey));
    entity.keyPrefix = overrides?.keyPrefix || keyPrefix;
    const f = await getFaker();
    entity.name = overrides?.name || f.company.name();
    entity.mode = mode;
    entity.isActive = overrides?.isActive ?? true;
    entity.lastUsedAt =
      overrides?.lastUsedAt instanceof Date
        ? overrides.lastUsedAt
        : overrides?.lastUsedAt
          ? new Date(overrides.lastUsedAt as any)
          : undefined;
    entity.lastUsedIp = overrides?.lastUsedIp || undefined;
    entity.revokedAt =
      overrides?.revokedAt instanceof Date
        ? overrides.revokedAt
        : overrides?.revokedAt
          ? new Date(overrides.revokedAt as any)
          : undefined;
    entity.revokedReason = overrides?.revokedReason || undefined;
    entity.expiresAt =
      overrides?.expiresAt instanceof Date
        ? overrides.expiresAt
        : overrides?.expiresAt
          ? new Date(overrides.expiresAt as any)
          : undefined;

    // Don't set timestamps - let TypeORM handle them
    // Only set if explicitly provided in overrides
    if (overrides?.createdAt) {
      entity.createdAt =
        overrides.createdAt instanceof Date
          ? overrides.createdAt
          : new Date(overrides.createdAt as any);
    }
    if (overrides?.updatedAt) {
      entity.updatedAt =
        overrides.updatedAt instanceof Date
          ? overrides.updatedAt
          : new Date(overrides.updatedAt as any);
    }

    return entity;
  }

  /**
   * Create and save an API key entity to database
   */
  static async create(
    tenantId: string,
    overrides?: DeepPartial<ApiKeyEntity>,
  ): Promise<ApiKeyEntity> {
    if (!this.dataSource) {
      throw new Error(
        'DataSource not set. Call ApiKeyFactory.setDataSource() first.',
      );
    }

    const apiKey = await this.build(tenantId, overrides);
    return this.dataSource.getRepository(ApiKeyEntity).save(apiKey);
  }

  /**
   * Create multiple API key entities
   */
  static async createMany(
    tenantId: string,
    count: number,
    overrides?: DeepPartial<ApiKeyEntity>,
  ): Promise<ApiKeyEntity[]> {
    if (!this.dataSource) {
      throw new Error(
        'DataSource not set. Call ApiKeyFactory.setDataSource() first.',
      );
    }

    const apiKeys = await Promise.all(
      Array.from({ length: count }, () => this.build(tenantId, overrides)),
    );
    return this.dataSource.getRepository(ApiKeyEntity).save(apiKeys);
  }

  /**
   * Build multiple API key entities without saving
   */
  static async buildMany(
    tenantId: string,
    count: number,
    overrides?: DeepPartial<ApiKeyEntity>,
  ): Promise<ApiKeyEntity[]> {
    return Promise.all(
      Array.from({ length: count }, () => this.build(tenantId, overrides)),
    );
  }

  /**
   * Create an API key with a valid key hash (for testing authentication)
   * Returns both the entity and the plaintext key
   */
  static async createWithValidKey(
    tenantId: string,
    overrides?: DeepPartial<ApiKeyEntity>,
  ): Promise<{ entity: ApiKeyEntity; plaintextKey: string }> {
    const mode = overrides?.mode || ApiKeyMode.TEST;
    const plaintextKey = await this.generateApiKey(mode);
    const keyHash = await hashApiKey(plaintextKey);
    const keyPrefix = plaintextKey.substring(
      0,
      plaintextKey.indexOf('_', plaintextKey.indexOf('_') + 1) + 1,
    );

    const entity = await this.create(tenantId, {
      ...overrides,
      keyHash,
      keyPrefix,
      mode,
    });

    return { entity, plaintextKey };
  }

  /**
   * Create a test mode API key
   */
  static async createTest(
    tenantId: string,
    overrides?: DeepPartial<ApiKeyEntity>,
  ): Promise<ApiKeyEntity> {
    return this.create(tenantId, { ...overrides, mode: ApiKeyMode.TEST });
  }

  /**
   * Create a live mode API key
   */
  static async createLive(
    tenantId: string,
    overrides?: DeepPartial<ApiKeyEntity>,
  ): Promise<ApiKeyEntity> {
    return this.create(tenantId, { ...overrides, mode: ApiKeyMode.LIVE });
  }

  /**
   * Create a revoked API key
   */
  static async createRevoked(
    tenantId: string,
    overrides?: DeepPartial<ApiKeyEntity>,
  ): Promise<ApiKeyEntity> {
    return this.create(tenantId, {
      ...overrides,
      isActive: false,
      revokedAt: new Date(),
      revokedReason: overrides?.revokedReason || 'Test revocation',
    });
  }

  /**
   * Create an expired API key
   */
  static async createExpired(
    tenantId: string,
    overrides?: DeepPartial<ApiKeyEntity>,
  ): Promise<ApiKeyEntity> {
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1);

    return this.create(tenantId, {
      ...overrides,
      expiresAt: expiredDate,
    });
  }
}
