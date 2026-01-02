import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { TwoFactorService } from '../services/two-factor.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { CreateApiKeyDto } from '../dto/api-key.dto';
import { ApiKeyMode } from '../entities/api-key.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let twoFactorService: jest.Mocked<TwoFactorService>;

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      verifyTwoFactor: jest.fn(),
      refreshToken: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      requestEmailVerification: jest.fn(),
      verifyEmail: jest.fn(),
      createApiKey: jest.fn(),
      listApiKeys: jest.fn(),
      revokeApiKey: jest.fn(),
    };

    const mockTwoFactorService = {
      generateSecret: jest.fn(),
      verifySetup: jest.fn(),
      disable: jest.fn(),
      regenerateBackupCodes: jest.fn(),
      getStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: TwoFactorService,
          useValue: mockTwoFactorService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    twoFactorService = module.get(TwoFactorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call authService.register with correct DTO', async () => {
      const dto: RegisterDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'StrongPass123!',
        companyName: 'Test Company',
        phone: '+1234567890',
      };
      const expectedResponse = {
        tenantId: 'tenant-1',
        email: 'test@example.com',
        message: 'Registration successful',
      };
      authService.register.mockResolvedValue(expectedResponse);

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('login', () => {
    it('should call authService.login with correct DTO', async () => {
      const dto: LoginDto = {
        email: 'test@example.com',
        password: 'StrongPass123!',
      };
      const expectedResponse = {
        auth: {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 900,
          tenant: {
            id: 'tenant-1',
            name: 'Test User',
            email: 'test@example.com',
            status: 'active' as any,
            kycStatus: 'pending' as any,
            defaultCurrency: 'NGN',
            timezone: 'Africa/Lagos',
          },
        },
      };
      authService.login.mockResolvedValue(expectedResponse);

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('verifyTwoFactor', () => {
    it('should call authService.verifyTwoFactor with correct DTO', async () => {
      const dto = {
        temporaryToken: 'temp-token',
        code: '123456',
      };
      const expectedResponse = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 900,
        tenant: {
          id: 'tenant-1',
          name: 'Test User',
          email: 'test@example.com',
          status: 'active' as any,
          kycStatus: 'pending' as any,
          defaultCurrency: 'NGN',
          timezone: 'Africa/Lagos',
        },
      };
      authService.verifyTwoFactor.mockResolvedValue(expectedResponse);

      const result = await controller.verifyTwoFactor(dto);

      expect(authService.verifyTwoFactor).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('refreshToken', () => {
    it('should call authService.refreshToken with correct DTO', async () => {
      const dto = {
        refreshToken: 'refresh-token',
      };
      const expectedResponse = {
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        expiresIn: 900,
        tenant: {
          id: 'tenant-1',
          name: 'Test User',
          email: 'test@example.com',
          status: 'active' as any,
          kycStatus: 'pending' as any,
          defaultCurrency: 'NGN',
          timezone: 'Africa/Lagos',
        },
      };
      authService.refreshToken.mockResolvedValue(expectedResponse);

      const result = await controller.refreshToken(dto);

      expect(authService.refreshToken).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword with correct DTO', async () => {
      const dto = {
        email: 'test@example.com',
      };
      const expectedResponse = {
        message: 'If an account exists, a password reset email has been sent',
      };
      authService.forgotPassword.mockResolvedValue(expectedResponse);

      const result = await controller.forgotPassword(dto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword with correct DTO', async () => {
      const dto = {
        token: 'reset-token',
        newPassword: 'NewStrongPass123!',
      };
      const expectedResponse = {
        message: 'Password reset successful',
      };
      authService.resetPassword.mockResolvedValue(expectedResponse);

      const result = await controller.resetPassword(dto);

      expect(authService.resetPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('requestEmailVerification', () => {
    it('should call authService.requestEmailVerification with correct DTO', async () => {
      const dto = {
        email: 'test@example.com',
      };
      const expectedResponse = {
        message:
          'If an account exists with this email and is unverified, a verification email has been sent.',
      };
      authService.requestEmailVerification.mockResolvedValue(expectedResponse);

      const result = await controller.requestEmailVerification(dto);

      expect(authService.requestEmailVerification).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('verifyEmail', () => {
    it('should call authService.verifyEmail with correct DTO', async () => {
      const dto = {
        token: 'verification-token',
      };
      const expectedResponse = {
        message: 'Email verified successfully',
      };
      authService.verifyEmail.mockResolvedValue(expectedResponse);

      const result = await controller.verifyEmail(dto);

      expect(authService.verifyEmail).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('createApiKey', () => {
    it('should call authService.createApiKey with correct parameters', async () => {
      const req = {
        user: {
          tenantId: 'tenant-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      };
      const dto: CreateApiKeyDto = {
        name: 'Test API Key',
        mode: ApiKeyMode.TEST,
      };
      const expectedResponse = {
        id: 'key-1',
        key: 'sk_test_abc123',
        keyPrefix: 'sk_test_',
        name: 'Test API Key',
        mode: ApiKeyMode.TEST,
        isActive: true,
        createdAt: new Date(),
      };
      authService.createApiKey.mockResolvedValue(expectedResponse);

      const result = await controller.createApiKey(req, dto);

      expect(authService.createApiKey).toHaveBeenCalledWith('tenant-1', dto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('listApiKeys', () => {
    it('should call authService.listApiKeys with tenant ID from request', async () => {
      const req = {
        user: {
          tenantId: 'tenant-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      };
      const expectedResponse = [
        {
          id: 'key-1',
          name: 'Key 1',
          keyPrefix: 'sk_test_',
          mode: ApiKeyMode.TEST,
          isActive: true,
          createdAt: new Date(),
        },
      ];
      authService.listApiKeys.mockResolvedValue(expectedResponse);

      const result = await controller.listApiKeys(req);

      expect(authService.listApiKeys).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('revokeApiKey', () => {
    it('should call authService.revokeApiKey with correct parameters', async () => {
      const req = {
        user: {
          tenantId: 'tenant-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      };
      const keyId = 'key-1';
      const expectedResponse = {
        message: 'API key revoked successfully',
      };
      authService.revokeApiKey.mockResolvedValue(expectedResponse);

      const result = await controller.revokeApiKey(req, keyId);

      expect(authService.revokeApiKey).toHaveBeenCalledWith('tenant-1', keyId);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('setupTwoFactor', () => {
    it('should call twoFactorService.generateSecret with tenant ID', async () => {
      const req = {
        user: {
          tenantId: 'tenant-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      };
      const expectedResponse = {
        secret: 'TEST_SECRET',
        qrCodeUrl: 'data:image/png;base64,...',
        backupCodes: ['CODE1', 'CODE2'],
      };
      twoFactorService.generateSecret.mockResolvedValue(expectedResponse);

      const result = await controller.setupTwoFactor(req);

      expect(twoFactorService.generateSecret).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('verifySetupTwoFactor', () => {
    it('should call twoFactorService.verifySetup with correct parameters', async () => {
      const req = {
        user: {
          tenantId: 'tenant-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      };
      const dto = {
        secret: 'TEST_SECRET',
        code: '123456',
      };
      twoFactorService.verifySetup.mockResolvedValue(undefined);

      const result = await controller.verifySetupTwoFactor(req, dto);

      expect(twoFactorService.verifySetup).toHaveBeenCalledWith(
        'tenant-1',
        dto.secret,
        dto.code,
      );
      expect(result).toEqual({ message: '2FA enabled successfully' });
    });
  });

  describe('disableTwoFactor', () => {
    it('should call twoFactorService.disable with correct parameters', async () => {
      const req = {
        user: {
          tenantId: 'tenant-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      };
      const dto = {
        password: 'password123',
      };
      twoFactorService.disable.mockResolvedValue(undefined);

      const result = await controller.disableTwoFactor(req, dto);

      expect(twoFactorService.disable).toHaveBeenCalledWith(
        'tenant-1',
        dto.password,
      );
      expect(result).toEqual({ message: '2FA disabled successfully' });
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should call twoFactorService.regenerateBackupCodes with tenant ID', async () => {
      const req = {
        user: {
          tenantId: 'tenant-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      };
      const expectedCodes = ['CODE1', 'CODE2', 'CODE3'];
      twoFactorService.regenerateBackupCodes.mockResolvedValue(expectedCodes);

      const result = await controller.regenerateBackupCodes(req);

      expect(twoFactorService.regenerateBackupCodes).toHaveBeenCalledWith(
        'tenant-1',
      );
      expect(result).toEqual({ backupCodes: expectedCodes });
    });
  });

  describe('getTwoFactorStatus', () => {
    it('should call twoFactorService.getStatus with tenant ID', async () => {
      const req = {
        user: {
          tenantId: 'tenant-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      };
      const expectedResponse = {
        enabled: true,
        enabledAt: new Date(),
        backupCodesRemaining: 8,
      };
      twoFactorService.getStatus.mockResolvedValue(expectedResponse);

      const result = await controller.getTwoFactorStatus(req);

      expect(twoFactorService.getStatus).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual(expectedResponse);
    });
  });
});
