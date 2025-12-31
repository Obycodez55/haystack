import {
  TenantEntity,
  TenantStatus,
  KycStatus,
} from '@modules/tenant/entities/tenant.entity';

/**
 * Static tenant fixtures for testing
 * Use these for consistent test data that doesn't need randomization
 */
export const tenantFixtures = {
  /**
   * Basic active tenant
   */
  activeTenant: (): Partial<TenantEntity> => ({
    name: 'Test Company',
    email: 'test@example.com',
    passwordHash: 'hashed_password_here',
    status: TenantStatus.ACTIVE,
    kycStatus: KycStatus.APPROVED,
    defaultCurrency: 'NGN',
    timezone: 'Africa/Lagos',
  }),

  /**
   * Suspended tenant
   */
  suspendedTenant: (): Partial<TenantEntity> => ({
    name: 'Suspended Company',
    email: 'suspended@example.com',
    passwordHash: 'hashed_password_here',
    status: TenantStatus.SUSPENDED,
    kycStatus: KycStatus.APPROVED,
    defaultCurrency: 'NGN',
    timezone: 'Africa/Lagos',
  }),

  /**
   * Tenant with pending KYC
   */
  pendingKycTenant: (): Partial<TenantEntity> => ({
    name: 'Pending KYC Company',
    email: 'pending@example.com',
    passwordHash: 'hashed_password_here',
    status: TenantStatus.ACTIVE,
    kycStatus: KycStatus.PENDING,
    defaultCurrency: 'NGN',
    timezone: 'Africa/Lagos',
  }),

  /**
   * Tenant with rejected KYC
   */
  rejectedKycTenant: (): Partial<TenantEntity> => ({
    name: 'Rejected KYC Company',
    email: 'rejected@example.com',
    passwordHash: 'hashed_password_here',
    status: TenantStatus.ACTIVE,
    kycStatus: KycStatus.REJECTED,
    kycRejectedReason: 'Incomplete documentation',
    defaultCurrency: 'NGN',
    timezone: 'Africa/Lagos',
  }),
};
