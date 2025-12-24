import { TenantFactory } from './tenant.factory';
import {
  TenantEntity,
  TenantStatus,
  KycStatus,
} from '@modules/tenant/entities/tenant.entity';
import { DatabaseHelper } from '../helpers/database.helper';

describe('TenantFactory', () => {
  beforeAll(async () => {
    await DatabaseHelper.setupTestDatabase();
    TenantFactory.setDataSource(DatabaseHelper.getTestDataSource());
  });

  afterAll(async () => {
    await DatabaseHelper.teardownTestDatabase();
  });

  describe('build', () => {
    it('should build a tenant entity without saving', async () => {
      const tenant = await TenantFactory.build();

      expect(tenant).toBeInstanceOf(TenantEntity);
      expect(tenant.name).toBeDefined();
      expect(tenant.email).toBeDefined();
      expect(tenant.status).toBe(TenantStatus.ACTIVE);
      expect(tenant.kycStatus).toBe(KycStatus.PENDING);
    });

    it('should allow overriding properties', async () => {
      const tenant = await TenantFactory.build({
        name: 'Custom Name',
        email: 'custom@example.com',
        status: TenantStatus.SUSPENDED,
      });

      expect(tenant.name).toBe('Custom Name');
      expect(tenant.email).toBe('custom@example.com');
      expect(tenant.status).toBe(TenantStatus.SUSPENDED);
    });
  });

  describe('create', () => {
    it('should create and save a tenant', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const tenant = await TenantFactory.create({
        name: 'Test Tenant',
        email: uniqueEmail,
      });

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe('Test Tenant');
      expect(tenant.email).toBe(uniqueEmail);
      expect(tenant.createdAt).toBeDefined();
    });
  });

  describe('createMany', () => {
    it('should create multiple tenants', async () => {
      const tenants = await TenantFactory.createMany(3);

      expect(tenants).toHaveLength(3);
      tenants.forEach((tenant) => {
        expect(tenant.id).toBeDefined();
        expect(tenant.email).toBeDefined();
      });
    });
  });

  describe('buildActive', () => {
    it('should build an active tenant', async () => {
      const tenant = await TenantFactory.buildActive();

      expect(tenant.status).toBe(TenantStatus.ACTIVE);
    });
  });

  describe('buildWithApprovedKyc', () => {
    it('should build a tenant with approved KYC', async () => {
      const tenant = await TenantFactory.buildWithApprovedKyc();

      expect(tenant.kycStatus).toBe(KycStatus.APPROVED);
      expect(tenant.kycApprovedAt).toBeInstanceOf(Date);
    });
  });

  describe('buildSuspended', () => {
    it('should build a suspended tenant', async () => {
      const tenant = await TenantFactory.buildSuspended();

      expect(tenant.status).toBe(TenantStatus.SUSPENDED);
    });
  });

  describe('buildMany', () => {
    it('should build multiple tenants without saving', async () => {
      const tenants = await TenantFactory.buildMany(3);

      expect(tenants).toHaveLength(3);
      tenants.forEach((tenant) => {
        expect(tenant).toBeInstanceOf(TenantEntity);
        expect(tenant.name).toBeDefined();
        expect(tenant.email).toBeDefined();
        expect(tenant.id).toBeUndefined(); // Not saved, so no ID
      });
    });
  });
});
