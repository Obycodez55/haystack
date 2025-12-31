import { Test, TestingModule } from '@nestjs/testing';
import { TenantController } from './tenant.controller';
import { TenantService } from '../services/tenant.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { TenantProfileDto, TenantSettingsDto, KycStatusDto } from '../dto';
import { TenantStatus, KycStatus } from '../entities/tenant.entity';

describe('TenantController', () => {
  let controller: TenantController;
  let tenantService: jest.Mocked<TenantService>;

  const mockUser = {
    tenantId: 'tenant-1',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(async () => {
    const mockTenantService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
      submitKyc: jest.fn(),
      getKycStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantController],
      providers: [
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<TenantController>(TenantController);
    tenantService = module.get(TenantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should call tenantService.getProfile with tenant ID from request', async () => {
      const req = { user: mockUser };
      const expectedResponse: TenantProfileDto = {
        id: 'tenant-1',
        name: 'Test Tenant',
        email: 'test@example.com',
        isEmailVerified: true,
        status: TenantStatus.ACTIVE,
        defaultCurrency: 'NGN',
        timezone: 'Africa/Lagos',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      tenantService.getProfile.mockResolvedValue(expectedResponse);

      const result = await controller.getProfile(req);

      expect(tenantService.getProfile).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('updateProfile', () => {
    it('should call tenantService.updateProfile with correct parameters', async () => {
      const req = { user: mockUser };
      const dto = {
        name: 'Updated Name',
        companyName: 'Updated Company',
      };
      const expectedResponse: TenantProfileDto = {
        id: 'tenant-1',
        name: 'Updated Name',
        email: 'test@example.com',
        isEmailVerified: true,
        status: TenantStatus.ACTIVE,
        companyName: 'Updated Company',
        defaultCurrency: 'NGN',
        timezone: 'Africa/Lagos',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      tenantService.updateProfile.mockResolvedValue(expectedResponse);

      const result = await controller.updateProfile(req, dto);

      expect(tenantService.updateProfile).toHaveBeenCalledWith('tenant-1', dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getSettings', () => {
    it('should call tenantService.getSettings with tenant ID', async () => {
      const req = { user: mockUser };
      const expectedResponse: TenantSettingsDto = {
        defaultCurrency: 'NGN',
        timezone: 'Africa/Lagos',
      };
      tenantService.getSettings.mockResolvedValue(expectedResponse);

      const result = await controller.getSettings(req);

      expect(tenantService.getSettings).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('updateSettings', () => {
    it('should call tenantService.updateSettings with correct parameters', async () => {
      const req = { user: mockUser };
      const dto = {
        defaultCurrency: 'USD',
        timezone: 'America/New_York',
      };
      const expectedResponse: TenantSettingsDto = {
        defaultCurrency: 'USD',
        timezone: 'America/New_York',
      };
      tenantService.updateSettings.mockResolvedValue(expectedResponse);

      const result = await controller.updateSettings(req, dto);

      expect(tenantService.updateSettings).toHaveBeenCalledWith(
        'tenant-1',
        dto,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('submitKyc', () => {
    it('should call tenantService.submitKyc with correct parameters', async () => {
      const req = { user: mockUser };
      const dto = {
        companyName: 'KYC Company',
        businessAddress: 'KYC Address',
      };
      const expectedResponse: KycStatusDto = {
        status: KycStatus.PENDING,
        submittedAt: new Date(),
      };
      tenantService.submitKyc.mockResolvedValue(expectedResponse);

      const result = await controller.submitKyc(req, dto);

      expect(tenantService.submitKyc).toHaveBeenCalledWith('tenant-1', dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getKycStatus', () => {
    it('should call tenantService.getKycStatus with tenant ID', async () => {
      const req = { user: mockUser };
      const expectedResponse: KycStatusDto = {
        status: KycStatus.PENDING,
      };
      tenantService.getKycStatus.mockResolvedValue(expectedResponse);

      const result = await controller.getKycStatus(req);

      expect(tenantService.getKycStatus).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual(expectedResponse);
    });
  });
});
