import { Test, TestingModule } from '@nestjs/testing';
import { TenantService } from './tenant.service';
import { TenantRepository } from '../repositories/tenant.repository';
import { LoggerService } from '@logging/services/logger.service';
import {
  TenantEntity,
  TenantStatus,
  KycStatus,
} from '../entities/tenant.entity';
import { TenantError } from '@common/errors/tenant.error';
import { createMockLogger } from '../../../../test/mocks';

describe('TenantService', () => {
  let service: TenantService;
  let tenantRepository: jest.Mocked<TenantRepository>;

  const mockTenant: TenantEntity = {
    id: 'tenant-1',
    name: 'Test Tenant',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    status: TenantStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    kycStatus: KycStatus.PENDING,
    defaultCurrency: 'NGN',
    timezone: 'Africa/Lagos',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as TenantEntity;

  beforeEach(async () => {
    const mockTenantRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: TenantRepository,
          useValue: mockTenantRepo,
        },
        {
          provide: LoggerService,
          useValue: createMockLogger(),
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
    tenantRepository = module.get(TenantRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return tenant profile', async () => {
      tenantRepository.findById.mockResolvedValue(mockTenant);

      const result = await service.getProfile('tenant-1');

      expect(result.id).toBe('tenant-1');
      expect(result.name).toBe('Test Tenant');
      expect(result.email).toBe('test@example.com');
      expect(result.isEmailVerified).toBe(true);
      expect(result.status).toBe(TenantStatus.ACTIVE);
      expect(tenantRepository.findById).toHaveBeenCalledWith('tenant-1');
    });

    it('should throw TenantError if tenant not found', async () => {
      tenantRepository.findById.mockResolvedValue(null);

      await expect(service.getProfile('tenant-1')).rejects.toThrow(TenantError);
      await expect(service.getProfile('tenant-1')).rejects.toThrow(
        'Tenant not found',
      );
    });

    it('should throw error if tenant is suspended', async () => {
      const suspended = { ...mockTenant, status: TenantStatus.SUSPENDED };
      tenantRepository.findById.mockResolvedValue(suspended);

      await expect(service.getProfile('tenant-1')).rejects.toThrow(TenantError);
      await expect(service.getProfile('tenant-1')).rejects.toThrow('suspended');
    });

    it('should throw error if tenant is deleted', async () => {
      const deleted = { ...mockTenant, status: TenantStatus.DELETED };
      tenantRepository.findById.mockResolvedValue(deleted);

      await expect(service.getProfile('tenant-1')).rejects.toThrow(TenantError);
      await expect(service.getProfile('tenant-1')).rejects.toThrow('deleted');
    });
  });

  describe('updateProfile', () => {
    it('should update tenant profile', async () => {
      const updated = {
        ...mockTenant,
        name: 'Updated Name',
        companyName: 'Updated Company',
      };
      tenantRepository.findById.mockResolvedValue(mockTenant);
      tenantRepository.update.mockResolvedValue(updated);

      const result = await service.updateProfile('tenant-1', {
        name: 'Updated Name',
        companyName: 'Updated Company',
      });

      expect(result.name).toBe('Updated Name');
      expect(result.companyName).toBe('Updated Company');
      expect(tenantRepository.update).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          name: 'Updated Name',
          companyName: 'Updated Company',
        }),
      );
    });

    it('should only update provided fields', async () => {
      const updated = { ...mockTenant, name: 'Updated Name' };
      tenantRepository.findById.mockResolvedValue(mockTenant);
      tenantRepository.update.mockResolvedValue(updated);

      await service.updateProfile('tenant-1', { name: 'Updated Name' });

      expect(tenantRepository.update).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          name: 'Updated Name',
        }),
      );
      expect(tenantRepository.update).toHaveBeenCalledWith(
        'tenant-1',
        expect.not.objectContaining({
          companyName: expect.anything(),
        }),
      );
    });
  });

  describe('getSettings', () => {
    it('should return tenant settings', async () => {
      tenantRepository.findById.mockResolvedValue(mockTenant);

      const result = await service.getSettings('tenant-1');

      expect(result.defaultCurrency).toBe('NGN');
      expect(result.timezone).toBe('Africa/Lagos');
    });
  });

  describe('updateSettings', () => {
    it('should update currency', async () => {
      const updated = { ...mockTenant, defaultCurrency: 'USD' };
      tenantRepository.findById.mockResolvedValue(mockTenant);
      tenantRepository.update.mockResolvedValue(updated);

      const result = await service.updateSettings('tenant-1', {
        defaultCurrency: 'USD',
      });

      expect(result.defaultCurrency).toBe('USD');
    });

    it('should update timezone', async () => {
      const updated = { ...mockTenant, timezone: 'America/New_York' };
      tenantRepository.findById.mockResolvedValue(mockTenant);
      tenantRepository.update.mockResolvedValue(updated);

      const result = await service.updateSettings('tenant-1', {
        timezone: 'America/New_York',
      });

      expect(result.timezone).toBe('America/New_York');
    });

    it('should throw error for invalid currency', async () => {
      tenantRepository.findById.mockResolvedValue(mockTenant);

      await expect(
        service.updateSettings('tenant-1', { defaultCurrency: 'INVALID' }),
      ).rejects.toThrow(TenantError);
      await expect(
        service.updateSettings('tenant-1', { defaultCurrency: 'INVALID' }),
      ).rejects.toThrow('Invalid currency');
    });

    it('should throw error for invalid timezone', async () => {
      tenantRepository.findById.mockResolvedValue(mockTenant);

      await expect(
        service.updateSettings('tenant-1', { timezone: 'Invalid/Timezone' }),
      ).rejects.toThrow(TenantError);
      await expect(
        service.updateSettings('tenant-1', { timezone: 'Invalid/Timezone' }),
      ).rejects.toThrow('Invalid timezone');
    });
  });

  describe('submitKyc', () => {
    it('should submit KYC information', async () => {
      const updated = {
        ...mockTenant,
        kycStatus: KycStatus.PENDING,
        kycSubmittedAt: new Date(),
        companyName: 'KYC Company',
        businessAddress: 'KYC Address',
      };
      tenantRepository.findById.mockResolvedValue(mockTenant);
      tenantRepository.update.mockResolvedValue(updated);

      const result = await service.submitKyc('tenant-1', {
        companyName: 'KYC Company',
        businessAddress: 'KYC Address',
      });

      expect(result.status).toBe(KycStatus.PENDING);
      expect(tenantRepository.update).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          kycStatus: KycStatus.PENDING,
          companyName: 'KYC Company',
          businessAddress: 'KYC Address',
        }),
      );
    });

    it('should allow resubmission if previously rejected', async () => {
      const rejected = {
        ...mockTenant,
        kycStatus: KycStatus.REJECTED,
        kycRejectedReason: 'Incomplete',
      };
      const updated = {
        ...rejected,
        kycStatus: KycStatus.PENDING,
        kycSubmittedAt: new Date(),
        kycRejectedReason: undefined,
      };
      tenantRepository.findById.mockResolvedValue(rejected);
      tenantRepository.update.mockResolvedValue(updated);

      await service.submitKyc('tenant-1', {
        companyName: 'New Company',
        businessAddress: 'New Address',
      });

      expect(tenantRepository.update).toHaveBeenCalled();
    });

    it('should throw error if KYC already approved', async () => {
      const approved = {
        ...mockTenant,
        kycStatus: KycStatus.APPROVED,
      };
      tenantRepository.findById.mockResolvedValue(approved);

      await expect(
        service.submitKyc('tenant-1', {
          companyName: 'Company',
          businessAddress: 'Address',
        }),
      ).rejects.toThrow(TenantError);
      await expect(
        service.submitKyc('tenant-1', {
          companyName: 'Company',
          businessAddress: 'Address',
        }),
      ).rejects.toThrow('already been submitted');
    });
  });

  describe('getKycStatus', () => {
    it('should return KYC status', async () => {
      tenantRepository.findById.mockResolvedValue(mockTenant);

      const result = await service.getKycStatus('tenant-1');

      expect(result.status).toBe(KycStatus.PENDING);
    });

    it('should include rejection reason if rejected', async () => {
      const rejected = {
        ...mockTenant,
        kycStatus: KycStatus.REJECTED,
        kycRejectedReason: 'Incomplete documentation',
      };
      tenantRepository.findById.mockResolvedValue(rejected);

      const result = await service.getKycStatus('tenant-1');

      expect(result.status).toBe(KycStatus.REJECTED);
      expect(result.rejectedReason).toBe('Incomplete documentation');
    });
  });
});
