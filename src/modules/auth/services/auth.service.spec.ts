import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { ApiKeyRepository } from '../repositories/api-key.repository';
import { TwoFactorService } from './two-factor.service';
import { JwtAuthService } from './jwt-auth.service';
import { EmailService } from '@modules/email/services/email.service';
import { LoggerService } from '@logging/services/logger.service';
import {
  TenantEntity,
  TenantStatus,
} from '@modules/tenant/entities/tenant.entity';
import { AuthenticationError } from '@common/errors/authentication.error';
import { ApiKeyMode } from '../entities/api-key.entity';
import { hashPassword } from '../utils/password.util';
import { createMockLogger } from '../../../../test/mocks';

describe('AuthService', () => {
  let service: AuthService;
  let tenantRepository: jest.Mocked<TenantRepository>;
  let apiKeyRepository: jest.Mocked<ApiKeyRepository>;
  let twoFactorService: jest.Mocked<TwoFactorService>;
  let jwtAuthService: jest.Mocked<JwtAuthService>;
  let emailService: jest.Mocked<EmailService>;
  let configService: jest.Mocked<ConfigService>;

  const mockTenant = {
    id: 'tenant-1',
    email: 'test@example.com',
    name: 'Test Tenant',
    passwordHash: 'hashed-password',
    status: TenantStatus.ACTIVE,
    emailVerifiedAt: null,
  } as unknown as TenantEntity;

  beforeEach(async () => {
    const mockTenantRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockApiKeyRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    };

    const mockTwoFactorService = {
      isEnabled: jest.fn(),
      verifyCode: jest.fn(),
      verifyBackupCode: jest.fn(),
    };

    const mockJwtAuthService = {
      generateVerificationToken: jest.fn(),
      generateResetToken: jest.fn(),
      generateTemporaryToken: jest.fn(),
      verifyToken: jest.fn(),
      generateTokens: jest.fn(),
      verifyRefreshToken: jest.fn(),
    };

    const mockEmailService = {
      sendWithTemplate: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'app.url') return 'http://localhost:3000';
        if (key === 'email') return { from: { email: 'support@haystack.com' } };
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: TenantRepository,
          useValue: mockTenantRepo,
        },
        {
          provide: ApiKeyRepository,
          useValue: mockApiKeyRepo,
        },
        {
          provide: TwoFactorService,
          useValue: mockTwoFactorService,
        },
        {
          provide: JwtAuthService,
          useValue: mockJwtAuthService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LoggerService,
          useValue: createMockLogger(),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    tenantRepository = module.get(TenantRepository);
    apiKeyRepository = module.get(ApiKeyRepository);
    twoFactorService = module.get(TwoFactorService);
    jwtAuthService = module.get(JwtAuthService);
    emailService = module.get(EmailService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validRegisterDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'StrongPass123!',
      companyName: 'Test Company',
      phone: '+1234567890',
    };

    it('should register a new tenant successfully', async () => {
      tenantRepository.findByEmail.mockResolvedValue(null);
      tenantRepository.create.mockResolvedValue(mockTenant);
      jwtAuthService.generateVerificationToken.mockReturnValue(
        'verification-token',
      );
      emailService.sendWithTemplate.mockResolvedValue({ success: true } as any);

      const result = await service.register(validRegisterDto);

      expect(result.tenantId).toBe(mockTenant.id);
      expect(result.email).toBe(mockTenant.email);
      expect(result.message).toContain('Registration successful');
      expect(tenantRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(tenantRepository.create).toHaveBeenCalled();
      expect(emailService.sendWithTemplate).toHaveBeenCalled();
    });

    it('should throw BadRequestException for weak password', async () => {
      const weakPasswordDto = { ...validRegisterDto, password: 'weak' };

      await expect(service.register(weakPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(tenantRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for duplicate email', async () => {
      tenantRepository.findByEmail.mockResolvedValue(mockTenant);

      await expect(service.register(validRegisterDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(validRegisterDto)).rejects.toThrow(
        'Email already registered',
      );
    });

    it('should normalize email to lowercase when creating tenant', async () => {
      const upperCaseEmailDto = {
        ...validRegisterDto,
        email: 'TEST@EXAMPLE.COM',
      };
      tenantRepository.findByEmail.mockResolvedValue(null);
      // Mock create to return tenant with lowercase email
      const tenantWithLowerEmail = { ...mockTenant, email: 'test@example.com' };
      tenantRepository.create.mockResolvedValue(
        tenantWithLowerEmail as TenantEntity,
      );
      jwtAuthService.generateVerificationToken.mockReturnValue('token');
      emailService.sendWithTemplate.mockResolvedValue({ success: true } as any);

      const result = await service.register(upperCaseEmailDto);

      // The service normalizes email when creating (not when checking)
      // The create should use lowercase email
      expect(tenantRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' }),
      );
      // Verify the result has lowercase email
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('login', () => {
    const validLoginDto = {
      email: 'test@example.com',
      password: 'StrongPass123!',
    };

    beforeEach(() => {
      // Mock password hash comparison
      jest
        .spyOn(require('../utils/password.util'), 'comparePassword')
        .mockResolvedValue(true);
    });

    it('should login successfully when 2FA is disabled', async () => {
      tenantRepository.findByEmail.mockResolvedValue(mockTenant);
      twoFactorService.isEnabled.mockResolvedValue(false);
      jwtAuthService.generateTokens.mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      });

      const result = await service.login(validLoginDto);

      expect(result.auth).toBeDefined();
      expect(result.auth?.accessToken).toBe('access-token');
      expect(result.requires2FA).toBeUndefined();
    });

    it('should return temporary token when 2FA is enabled', async () => {
      tenantRepository.findByEmail.mockResolvedValue(mockTenant);
      twoFactorService.isEnabled.mockResolvedValue(true);
      jwtAuthService.generateTemporaryToken.mockReturnValue('temporary-token');

      const result = await service.login(validLoginDto);

      expect(result.requires2FA).toBe(true);
      expect(result.temporaryToken).toBe('temporary-token');
      expect(result.auth).toBeUndefined();
    });

    it('should throw AuthenticationError for non-existent email', async () => {
      tenantRepository.findByEmail.mockResolvedValue(null);

      await expect(service.login(validLoginDto)).rejects.toThrow(
        AuthenticationError,
      );
    });

    it('should throw AuthenticationError for invalid password', async () => {
      tenantRepository.findByEmail.mockResolvedValue(mockTenant);
      jest
        .spyOn(require('../utils/password.util'), 'comparePassword')
        .mockResolvedValue(false);

      await expect(service.login(validLoginDto)).rejects.toThrow(
        AuthenticationError,
      );
    });

    it('should throw UnauthorizedException for inactive tenant', async () => {
      const inactiveTenant = { ...mockTenant, status: TenantStatus.SUSPENDED };
      tenantRepository.findByEmail.mockResolvedValue(
        inactiveTenant as TenantEntity,
      );

      await expect(service.login(validLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyTwoFactor', () => {
    const validVerifyDto = {
      temporaryToken: 'temporary-token',
      code: '123456',
    };

    it('should complete login with valid TOTP code', async () => {
      const payload = {
        sub: 'tenant-1',
        email: 'test@example.com',
        type: 'temporary',
      };
      jwtAuthService.verifyToken.mockReturnValue(payload as any);
      tenantRepository.findById.mockResolvedValue(mockTenant);
      twoFactorService.verifyCode.mockResolvedValue(true);
      jwtAuthService.generateTokens.mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      });

      const result = await service.verifyTwoFactor(validVerifyDto);

      expect(result.accessToken).toBe('access-token');
      expect(twoFactorService.verifyCode).toHaveBeenCalledWith(
        'tenant-1',
        '123456',
      );
    });

    it('should complete login with valid backup code', async () => {
      const payload = {
        sub: 'tenant-1',
        email: 'test@example.com',
        type: 'temporary',
      };
      jwtAuthService.verifyToken.mockReturnValue(payload as any);
      tenantRepository.findById.mockResolvedValue(mockTenant);
      twoFactorService.verifyCode.mockResolvedValue(false);
      twoFactorService.verifyBackupCode.mockResolvedValue(true);
      jwtAuthService.generateTokens.mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      });

      const result = await service.verifyTwoFactor(validVerifyDto);

      expect(result.accessToken).toBe('access-token');
      expect(twoFactorService.verifyBackupCode).toHaveBeenCalledWith(
        'tenant-1',
        '123456',
      );
    });

    it('should throw AuthenticationError for invalid code', async () => {
      const payload = {
        sub: 'tenant-1',
        email: 'test@example.com',
        type: 'temporary',
      };
      jwtAuthService.verifyToken.mockReturnValue(payload as any);
      tenantRepository.findById.mockResolvedValue(mockTenant);
      twoFactorService.verifyCode.mockResolvedValue(false);
      twoFactorService.verifyBackupCode.mockResolvedValue(false);

      await expect(service.verifyTwoFactor(validVerifyDto)).rejects.toThrow(
        AuthenticationError,
      );
    });
  });

  describe('refreshToken', () => {
    const validRefreshDto = {
      refreshToken: 'refresh-token',
    };

    it('should generate new tokens with valid refresh token', async () => {
      const payload = {
        sub: 'tenant-1',
        email: 'test@example.com',
        name: 'Test',
      };
      jwtAuthService.verifyRefreshToken.mockReturnValue(payload as any);
      tenantRepository.findById.mockResolvedValue(mockTenant);
      jwtAuthService.generateTokens.mockReturnValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      });

      const result = await service.refreshToken(validRefreshDto);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jwtAuthService.verifyRefreshToken.mockReturnValue(null);

      await expect(service.refreshToken(validRefreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    const validForgotDto = {
      email: 'test@example.com',
    };

    it('should send reset email even if email does not exist (security)', async () => {
      tenantRepository.findByEmail.mockResolvedValue(null);
      emailService.sendWithTemplate.mockResolvedValue({ success: true } as any);

      const result = await service.forgotPassword(validForgotDto);

      expect(result.message).toContain('If an account exists');
      // Should not reveal whether email exists
      expect(emailService.sendWithTemplate).not.toHaveBeenCalled();
    });

    it('should send reset email for existing email', async () => {
      tenantRepository.findByEmail.mockResolvedValue(mockTenant);
      jwtAuthService.generateResetToken.mockReturnValue('reset-token');
      emailService.sendWithTemplate.mockResolvedValue({ success: true } as any);

      const result = await service.forgotPassword(validForgotDto);

      expect(result.message).toContain('If an account exists');
      expect(emailService.sendWithTemplate).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const validResetDto = {
      token: 'reset-token',
      newPassword: 'NewStrongPass123!',
    };

    beforeEach(() => {
      jest
        .spyOn(require('../utils/password.util'), 'hashPassword')
        .mockResolvedValue('new-hashed-password');
    });

    it('should reset password with valid token', async () => {
      const payload = {
        sub: 'tenant-1',
        email: 'test@example.com',
        type: 'reset',
      };
      jwtAuthService.verifyToken.mockReturnValue(payload as any);
      tenantRepository.findById.mockResolvedValue(mockTenant);
      tenantRepository.update.mockResolvedValue(mockTenant);

      const result = await service.resetPassword(validResetDto);

      expect(result.message).toContain('Password reset successful');
      expect(tenantRepository.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jwtAuthService.verifyToken.mockReturnValue(null);

      await expect(service.resetPassword(validResetDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException for weak password', async () => {
      const weakPasswordDto = { ...validResetDto, newPassword: 'weak' };
      // First need a valid token
      const payload = {
        sub: 'tenant-1',
        email: 'test@example.com',
        type: 'reset',
      };
      jwtAuthService.verifyToken.mockReturnValue(payload as any);

      await expect(service.resetPassword(weakPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyEmail', () => {
    const validVerifyDto = {
      token: 'verification-token',
    };

    it('should verify email with valid token', async () => {
      const payload = {
        sub: 'tenant-1',
        email: 'test@example.com',
        type: 'verification',
      };
      jwtAuthService.verifyToken.mockReturnValue(payload as any);
      tenantRepository.findById.mockResolvedValue(mockTenant);
      tenantRepository.update.mockResolvedValue(mockTenant);

      const result = await service.verifyEmail(validVerifyDto);

      expect(result.message).toContain('Email verified successfully');
      expect(tenantRepository.update).toHaveBeenCalled();
    });

    it('should return success if email already verified', async () => {
      const verifiedTenant = { ...mockTenant, emailVerifiedAt: new Date() };
      const payload = {
        sub: 'tenant-1',
        email: 'test@example.com',
        type: 'verification',
      };
      jwtAuthService.verifyToken.mockReturnValue(payload as any);
      tenantRepository.findById.mockResolvedValue(
        verifiedTenant as TenantEntity,
      );

      const result = await service.verifyEmail(validVerifyDto);

      expect(result.message).toContain('Email is already verified');
      expect(tenantRepository.update).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jwtAuthService.verifyToken.mockReturnValue(null);

      await expect(service.verifyEmail(validVerifyDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('requestEmailVerification', () => {
    const validRequestDto = {
      email: 'test@example.com',
    };

    beforeEach(() => {
      // Mock email service
      emailService.sendWithTemplate = jest.fn().mockResolvedValue({
        success: true,
        messageId: 'email-123',
        provider: 'brevo',
        sentAt: new Date(),
      });
      // Mock JWT service
      jwtAuthService.generateVerificationToken = jest
        .fn()
        .mockReturnValue('verification-token');
      // Mock config service
      configService.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'app.url') return 'http://localhost:3000';
        if (key === 'email') {
          return {
            from: { email: 'support@haystack.com' },
          };
        }
        return null;
      });
    });

    it('should send verification email for unverified tenant', async () => {
      tenantRepository.findByEmail.mockResolvedValue(mockTenant);

      const result = await service.requestEmailVerification(validRequestDto);

      expect(result.message).toContain('verification email has been sent');
      expect(tenantRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(jwtAuthService.generateVerificationToken).toHaveBeenCalledWith(
        mockTenant.id,
        mockTenant.email,
      );
      expect(emailService.sendWithTemplate).toHaveBeenCalled();
    });

    it('should return generic message if tenant not found', async () => {
      tenantRepository.findByEmail.mockResolvedValue(null);

      const result = await service.requestEmailVerification(validRequestDto);

      expect(result.message).toContain('verification email has been sent');
      expect(tenantRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(jwtAuthService.generateVerificationToken).not.toHaveBeenCalled();
      expect(emailService.sendWithTemplate).not.toHaveBeenCalled();
    });

    it('should return generic message if email already verified', async () => {
      const verifiedTenant = {
        ...mockTenant,
        emailVerifiedAt: new Date(),
      };
      tenantRepository.findByEmail.mockResolvedValue(
        verifiedTenant as TenantEntity,
      );

      const result = await service.requestEmailVerification(validRequestDto);

      expect(result.message).toContain('verification email has been sent');
      expect(tenantRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(jwtAuthService.generateVerificationToken).not.toHaveBeenCalled();
      expect(emailService.sendWithTemplate).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      tenantRepository.findByEmail.mockResolvedValue(mockTenant);

      await service.requestEmailVerification({
        email: 'TEST@EXAMPLE.COM',
      });

      expect(tenantRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('should handle errors and throw them', async () => {
      const error = new Error('Database error');
      tenantRepository.findByEmail.mockRejectedValue(error);

      await expect(
        service.requestEmailVerification(validRequestDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('createApiKey', () => {
    const validCreateDto = {
      name: 'Test API Key',
      mode: ApiKeyMode.TEST,
    };

    it('should create API key successfully', async () => {
      const mockApiKey = {
        id: 'api-key-1',
        name: 'Test API Key',
        keyHash: 'hashed-key',
        keyPrefix: 'sk_test_',
        mode: 'test' as const,
        isActive: true,
        createdAt: new Date(),
      };
      jest
        .spyOn(require('../utils/api-key-generator.util'), 'generateApiKey')
        .mockReturnValue({ key: 'sk_test_abc123', prefix: 'sk_test_' });
      jest
        .spyOn(require('../utils/api-key-hash.util'), 'hashApiKey')
        .mockReturnValue('hashed-key');
      apiKeyRepository.create.mockResolvedValue(mockApiKey as any);

      const result = await service.createApiKey('tenant-1', validCreateDto);

      expect(result.key).toBe('sk_test_abc123');
      expect(result.keyPrefix).toBe('sk_test_');
      expect(apiKeyRepository.create).toHaveBeenCalled();
    });
  });

  describe('listApiKeys', () => {
    it('should return list of API keys for tenant', async () => {
      const mockApiKeys = [
        {
          id: 'api-key-1',
          name: 'Key 1',
          keyPrefix: 'sk_test_',
          mode: 'test' as const,
          isActive: true,
          createdAt: new Date(),
        },
      ];
      apiKeyRepository.findAll.mockResolvedValue(mockApiKeys as any);

      const result = await service.listApiKeys('tenant-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Key 1');
      expect(apiKeyRepository.findAll).toHaveBeenCalledWith('tenant-1');
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke API key successfully', async () => {
      const mockApiKey = {
        id: 'api-key-1',
        tenantId: 'tenant-1',
        isActive: true,
      };
      apiKeyRepository.findById.mockResolvedValue(mockApiKey as any);
      apiKeyRepository.update.mockResolvedValue(mockApiKey as any);

      const result = await service.revokeApiKey('tenant-1', 'api-key-1');

      expect(result.message).toContain('API key revoked successfully');
      expect(apiKeyRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent API key', async () => {
      apiKeyRepository.findById.mockResolvedValue(null);

      await expect(
        service.revokeApiKey('tenant-1', 'api-key-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
