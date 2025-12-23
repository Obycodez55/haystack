import { DeepPartial } from 'typeorm';
import {
  TenantEntity,
  TenantStatus,
  KycStatus,
} from '@modules/tenant/entities/tenant.entity';
import { DataSource } from 'typeorm';

// Dynamic import for Faker to handle ES modules
let faker: any;
async function getFaker() {
  if (!faker) {
    faker = (await import('@faker-js/faker')).faker;
  }
  return faker;
}

/**
 * Tenant factory for creating test tenant entities
 * Follows factory pattern for DRY test data creation
 */
export class TenantFactory {
  private static dataSource: DataSource | null = null;

  /**
   * Set the DataSource for saving entities
   */
  static setDataSource(dataSource: DataSource): void {
    this.dataSource = dataSource;
  }

  /**
   * Build a tenant entity without saving to database
   */
  static async build(
    overrides?: DeepPartial<TenantEntity>,
  ): Promise<TenantEntity> {
    const f = await getFaker();
    const tenant = new TenantEntity();

    tenant.name = overrides?.name || f.company.name();
    tenant.email = overrides?.email || f.internet.email().toLowerCase();
    tenant.passwordHash = overrides?.passwordHash || f.string.alphanumeric(60);
    tenant.status = overrides?.status || TenantStatus.ACTIVE;
    tenant.kycStatus = overrides?.kycStatus || KycStatus.PENDING;
    tenant.companyName = overrides?.companyName || f.company.name();
    tenant.companyRegistrationNumber =
      overrides?.companyRegistrationNumber || f.string.alphanumeric(10);
    tenant.businessAddress =
      overrides?.businessAddress || f.location.streetAddress();
    tenant.phone = overrides?.phone || f.phone.number();
    tenant.defaultCurrency = overrides?.defaultCurrency || 'NGN';
    tenant.timezone = overrides?.timezone || 'Africa/Lagos';
    tenant.metadata = overrides?.metadata || {};
    tenant.deletedAt =
      overrides?.deletedAt instanceof Date
        ? overrides.deletedAt
        : overrides?.deletedAt
          ? new Date(overrides.deletedAt as any)
          : undefined;
    tenant.kycSubmittedAt =
      overrides?.kycSubmittedAt instanceof Date
        ? overrides.kycSubmittedAt
        : overrides?.kycSubmittedAt
          ? new Date(overrides.kycSubmittedAt as any)
          : undefined;
    tenant.kycApprovedAt =
      overrides?.kycApprovedAt instanceof Date
        ? overrides.kycApprovedAt
        : overrides?.kycApprovedAt
          ? new Date(overrides.kycApprovedAt as any)
          : undefined;
    tenant.kycRejectedReason = overrides?.kycRejectedReason || undefined;

    // Set timestamps
    tenant.createdAt =
      overrides?.createdAt instanceof Date
        ? overrides.createdAt
        : overrides?.createdAt
          ? new Date(overrides.createdAt as any)
          : new Date();
    tenant.updatedAt =
      overrides?.updatedAt instanceof Date
        ? overrides.updatedAt
        : overrides?.updatedAt
          ? new Date(overrides.updatedAt as any)
          : new Date();

    return tenant;
  }

  /**
   * Create and save a tenant entity to database
   */
  static async create(
    overrides?: DeepPartial<TenantEntity>,
  ): Promise<TenantEntity> {
    if (!this.dataSource) {
      throw new Error(
        'DataSource not set. Call TenantFactory.setDataSource() first.',
      );
    }

    const tenant = await this.build(overrides);
    return this.dataSource.getRepository(TenantEntity).save(tenant);
  }

  /**
   * Create multiple tenant entities
   */
  static async createMany(
    count: number,
    overrides?: DeepPartial<TenantEntity>,
  ): Promise<TenantEntity[]> {
    if (!this.dataSource) {
      throw new Error(
        'DataSource not set. Call TenantFactory.setDataSource() first.',
      );
    }

    const tenants = await Promise.all(
      Array.from({ length: count }, () => this.build(overrides)),
    );
    return this.dataSource.getRepository(TenantEntity).save(tenants);
  }

  /**
   * Build multiple tenant entities without saving
   */
  static async buildMany(
    count: number,
    overrides?: DeepPartial<TenantEntity>,
  ): Promise<TenantEntity[]> {
    return Promise.all(
      Array.from({ length: count }, () => this.build(overrides)),
    );
  }

  /**
   * Create a tenant with active status
   */
  static async buildActive(
    overrides?: DeepPartial<TenantEntity>,
  ): Promise<TenantEntity> {
    return this.build({ ...overrides, status: TenantStatus.ACTIVE });
  }

  /**
   * Create a tenant with suspended status
   */
  static async buildSuspended(
    overrides?: DeepPartial<TenantEntity>,
  ): Promise<TenantEntity> {
    return this.build({ ...overrides, status: TenantStatus.SUSPENDED });
  }

  /**
   * Create a tenant with approved KYC
   */
  static async buildWithApprovedKyc(
    overrides?: DeepPartial<TenantEntity>,
  ): Promise<TenantEntity> {
    return this.build({
      ...overrides,
      kycStatus: KycStatus.APPROVED,
      kycApprovedAt: new Date(),
    });
  }
}
