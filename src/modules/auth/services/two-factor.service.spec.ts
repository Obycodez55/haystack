import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorRepository } from '../repositories/two-factor.repository';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { EmailService } from '@modules/email/services/email.service';
import { LoggerService } from '@logging/services/logger.service';
import {
  TenantEntity,
  TenantStatus,
} from '@modules/tenant/entities/tenant.entity';
import { TwoFactorEntity } from '../entities/two-factor.entity';
import { AuthenticationError } from '@common/errors/authentication.error';
import { createMockLogger } from '../../../../test/mocks';
import { EncryptionUtil } from '../utils/encryption.util';

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let twoFactorRepository: jest.Mocked<TwoFactorRepository>;
  let tenantRepository: jest.Mocked<TenantRepository>;
  let emailService: jest.Mocked<EmailService>;
  let configService: jest.Mocked<ConfigService>;
  let encryptionUtil: EncryptionUtil;

  // Use a test encryption key
  const testEncryptionKey = 'test-encryption-key-for-testing-only-32chars';

  const mockTenant: TenantEntity = {
    id: 'tenant-1',
    email: 'test@example.com',
    name: 'Test Tenant',
    status: TenantStatus.ACTIVE,
  } as TenantEntity;

  // Helper to create encrypted secret for mocks
  const createEncryptedSecret = (plaintext: string): string => {
    const util = new EncryptionUtil(testEncryptionKey);
    return util.encrypt(plaintext);
  };

  const mockTwoFactor: TwoFactorEntity = {
    id: '2fa-1',
    tenantId: 'tenant-1',
    secret: createEncryptedSecret('TEST_SECRET'),
    isEnabled: true,
    enabledAt: new Date(),
    backupCodes: ['hashed-code-1', 'hashed-code-2'],
    backupCodesUsed: 0,
  } as TwoFactorEntity;

  beforeEach(async () => {
    const mockTwoFactorRepo = {
      findByTenantId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateLastVerified: jest.fn(),
      isEnabled: jest.fn(),
    };

    const mockTenantRepo = {
      findById: jest.fn(),
    };

    const mockEmailService = {
      sendWithTemplate: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'app.name') return 'Haystack';
        if (key === 'email.from.email') return 'support@haystack.com';
        if (key === 'ENCRYPTION_KEY') return testEncryptionKey;
        return undefined;
      }),
    };

    encryptionUtil = new EncryptionUtil(testEncryptionKey);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        {
          provide: TwoFactorRepository,
          useValue: mockTwoFactorRepo,
        },
        {
          provide: TenantRepository,
          useValue: mockTenantRepo,
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

    service = module.get<TwoFactorService>(TwoFactorService);
    twoFactorRepository = module.get(TwoFactorRepository);
    tenantRepository = module.get(TenantRepository);
    emailService = module.get(EmailService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSecret', () => {
    it('should generate secret and QR code for new setup', async () => {
      twoFactorRepository.findByTenantId.mockResolvedValue(null);
      tenantRepository.findById.mockResolvedValue(mockTenant);
      emailService.sendWithTemplate.mockResolvedValue({ success: true } as any);

      const result = await service.generateSecret('tenant-1');

      expect(result.secret).toBeDefined();
      expect(result.qrCodeUrl).toBeDefined();
      expect(result.qrCodeUrl).toMatch(/^data:image\/png;base64,/);
      expect(result.backupCodes).toHaveLength(10);
      expect(emailService.sendWithTemplate).toHaveBeenCalled();
    });

    it('should throw BadRequestException if 2FA is already enabled', async () => {
      twoFactorRepository.findByTenantId.mockResolvedValue(mockTwoFactor);

      await expect(service.generateSecret('tenant-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.generateSecret('tenant-1')).rejects.toThrow(
        '2FA is already enabled',
      );
    });

    it('should throw NotFoundException if tenant not found', async () => {
      twoFactorRepository.findByTenantId.mockResolvedValue(null);
      tenantRepository.findById.mockResolvedValue(null);

      await expect(service.generateSecret('tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('verifySetup', () => {
    beforeEach(() => {
      jest
        .spyOn(require('../utils/totp.util'), 'verifyTOTPCode')
        .mockReturnValue(true);
      jest
        .spyOn(require('../utils/password.util'), 'hashPassword')
        .mockImplementation((code: string) =>
          Promise.resolve(`hashed-${code}`),
        );
    });

    it('should enable 2FA with valid code', async () => {
      const secret = 'TEST_SECRET';
      const code = '123456';
      twoFactorRepository.findByTenantId.mockResolvedValue(null);
      tenantRepository.findById.mockResolvedValue(mockTenant);
      twoFactorRepository.create.mockResolvedValue(mockTwoFactor);

      await service.verifySetup('tenant-1', secret, code);

      expect(twoFactorRepository.create).toHaveBeenCalled();
      const createCall = twoFactorRepository.create.mock.calls[0][0];
      expect(createCall.tenantId).toBe('tenant-1');
      expect(createCall.isEnabled).toBe(true);
      // Secret should be encrypted (not plaintext)
      expect(createCall.secret).toBeDefined();
      expect(createCall.secret).not.toBe(secret);
      expect(createCall.secret).toContain(':'); // Encrypted format: iv:tag:encrypted
      // Verify it can be decrypted back to original
      if (createCall.secret) {
        const decrypted = encryptionUtil.decrypt(createCall.secret);
        expect(decrypted).toBe(secret);
      }
    });

    it('should update existing 2FA entity', async () => {
      const secret = 'TEST_SECRET';
      const code = '123456';
      const existing = { ...mockTwoFactor, isEnabled: false };
      twoFactorRepository.findByTenantId.mockResolvedValue(existing);
      tenantRepository.findById.mockResolvedValue(mockTenant);
      twoFactorRepository.update.mockResolvedValue(mockTwoFactor);

      await service.verifySetup('tenant-1', secret, code);

      expect(twoFactorRepository.update).toHaveBeenCalled();
      expect(twoFactorRepository.create).not.toHaveBeenCalled();
      const updateCall = twoFactorRepository.update.mock.calls[0][2];
      // Secret should be encrypted
      expect(updateCall.secret).toBeDefined();
      expect(updateCall.secret).not.toBe(secret);
      expect(updateCall.secret).toContain(':'); // Encrypted format
      // Verify it can be decrypted
      if (updateCall.secret) {
        const decrypted = encryptionUtil.decrypt(updateCall.secret);
        expect(decrypted).toBe(secret);
      }
    });

    it('should throw AuthenticationError for invalid code', async () => {
      jest
        .spyOn(require('../utils/totp.util'), 'verifyTOTPCode')
        .mockReturnValue(false);
      const secret = 'TEST_SECRET';
      const code = '000000';

      await expect(
        service.verifySetup('tenant-1', secret, code),
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw NotFoundException if tenant not found', async () => {
      jest
        .spyOn(require('../utils/totp.util'), 'verifyTOTPCode')
        .mockReturnValue(true);
      tenantRepository.findById.mockResolvedValue(null);

      await expect(
        service.verifySetup('tenant-1', 'secret', '123456'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyCode', () => {
    it('should return true for valid TOTP code', async () => {
      jest
        .spyOn(require('../utils/totp.util'), 'verifyTOTPCode')
        .mockReturnValue(true);
      twoFactorRepository.findByTenantId.mockResolvedValue(mockTwoFactor);
      twoFactorRepository.updateLastVerified.mockResolvedValue(undefined);

      const result = await service.verifyCode('tenant-1', '123456');

      expect(result).toBe(true);
      expect(twoFactorRepository.updateLastVerified).toHaveBeenCalledWith(
        'tenant-1',
      );
    });

    it('should return false for invalid TOTP code', async () => {
      jest
        .spyOn(require('../utils/totp.util'), 'verifyTOTPCode')
        .mockReturnValue(false);
      twoFactorRepository.findByTenantId.mockResolvedValue(mockTwoFactor);

      const result = await service.verifyCode('tenant-1', '000000');

      expect(result).toBe(false);
      expect(twoFactorRepository.updateLastVerified).not.toHaveBeenCalled();
    });

    it('should return false if 2FA is not enabled', async () => {
      const disabled = { ...mockTwoFactor, isEnabled: false };
      twoFactorRepository.findByTenantId.mockResolvedValue(disabled);

      const result = await service.verifyCode('tenant-1', '123456');

      expect(result).toBe(false);
    });

    it('should return false if 2FA not found', async () => {
      twoFactorRepository.findByTenantId.mockResolvedValue(null);

      const result = await service.verifyCode('tenant-1', '123456');

      expect(result).toBe(false);
    });
  });

  describe('verifyBackupCode', () => {
    beforeEach(() => {
      jest
        .spyOn(require('../utils/password.util'), 'comparePassword')
        .mockImplementation(
          async (code: string, hash: string) => hash === `hashed-${code}`,
        );
    });

    it('should return true for valid backup code', async () => {
      const twoFactorWithHashedCodes = {
        ...mockTwoFactor,
        backupCodes: ['hashed-BACKUP1', 'hashed-BACKUP2'],
      };
      twoFactorRepository.findByTenantId.mockResolvedValue(
        twoFactorWithHashedCodes,
      );
      twoFactorRepository.update.mockResolvedValue(mockTwoFactor);

      const result = await service.verifyBackupCode('tenant-1', 'BACKUP1');

      expect(result).toBe(true);
      expect(twoFactorRepository.update).toHaveBeenCalled();
    });

    it('should return false for invalid backup code', async () => {
      const twoFactorWithHashedCodes = {
        ...mockTwoFactor,
        backupCodes: ['hashed-BACKUP1', 'hashed-BACKUP2'],
      };
      twoFactorRepository.findByTenantId.mockResolvedValue(
        twoFactorWithHashedCodes,
      );

      const result = await service.verifyBackupCode('tenant-1', 'INVALID');

      expect(result).toBe(false);
    });

    it('should return false if 2FA is not enabled', async () => {
      const disabled = { ...mockTwoFactor, isEnabled: false };
      twoFactorRepository.findByTenantId.mockResolvedValue(disabled);

      const result = await service.verifyBackupCode('tenant-1', 'BACKUP1');

      expect(result).toBe(false);
    });

    it('should return false if no backup codes', async () => {
      const noCodes = { ...mockTwoFactor, backupCodes: undefined };
      twoFactorRepository.findByTenantId.mockResolvedValue(noCodes);

      const result = await service.verifyBackupCode('tenant-1', 'BACKUP1');

      expect(result).toBe(false);
    });
  });

  describe('disable', () => {
    beforeEach(() => {
      jest
        .spyOn(require('../utils/password.util'), 'comparePassword')
        .mockResolvedValue(true);
    });

    it('should disable 2FA with valid password', async () => {
      tenantRepository.findById.mockResolvedValue(mockTenant);
      twoFactorRepository.findByTenantId.mockResolvedValue(mockTwoFactor);
      twoFactorRepository.update.mockResolvedValue(mockTwoFactor);

      await service.disable('tenant-1', 'password123');

      expect(twoFactorRepository.update).toHaveBeenCalledWith(
        '2fa-1',
        'tenant-1',
        expect.objectContaining({
          isEnabled: false,
          backupCodes: null,
          backupCodesUsed: 0,
        }),
      );
    });

    it('should throw AuthenticationError for invalid password', async () => {
      jest
        .spyOn(require('../utils/password.util'), 'comparePassword')
        .mockResolvedValue(false);
      tenantRepository.findById.mockResolvedValue(mockTenant);

      await expect(
        service.disable('tenant-1', 'wrong-password'),
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw NotFoundException if tenant not found', async () => {
      tenantRepository.findById.mockResolvedValue(null);

      await expect(service.disable('tenant-1', 'password')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if 2FA not set up', async () => {
      tenantRepository.findById.mockResolvedValue(mockTenant);
      twoFactorRepository.findByTenantId.mockResolvedValue(null);

      await expect(service.disable('tenant-1', 'password')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.disable('tenant-1', 'password')).rejects.toThrow(
        '2FA not set up',
      );
    });
  });

  describe('regenerateBackupCodes', () => {
    beforeEach(() => {
      jest
        .spyOn(require('../utils/password.util'), 'hashPassword')
        .mockImplementation((code: string) =>
          Promise.resolve(`hashed-${code}`),
        );
    });

    it('should regenerate backup codes', async () => {
      // Use encrypted secret in mock
      const twoFactorWithEncryptedSecret = {
        ...mockTwoFactor,
        secret: createEncryptedSecret('TEST_SECRET'),
      };
      twoFactorRepository.findByTenantId.mockResolvedValue(
        twoFactorWithEncryptedSecret,
      );
      twoFactorRepository.update.mockResolvedValue(
        twoFactorWithEncryptedSecret,
      );
      tenantRepository.findById.mockResolvedValue(mockTenant);
      emailService.sendWithTemplate.mockResolvedValue({ success: true } as any);

      const result = await service.regenerateBackupCodes('tenant-1');

      expect(result).toHaveLength(10);
      expect(twoFactorRepository.update).toHaveBeenCalled();
      expect(emailService.sendWithTemplate).toHaveBeenCalled();
    });

    it('should throw BadRequestException if 2FA not enabled', async () => {
      const disabled = { ...mockTwoFactor, isEnabled: false };
      twoFactorRepository.findByTenantId.mockResolvedValue(disabled);

      await expect(service.regenerateBackupCodes('tenant-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.regenerateBackupCodes('tenant-1')).rejects.toThrow(
        '2FA is not enabled',
      );
    });

    it('should throw BadRequestException if 2FA not found', async () => {
      twoFactorRepository.findByTenantId.mockResolvedValue(null);

      await expect(service.regenerateBackupCodes('tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('isEnabled', () => {
    it('should return true if 2FA is enabled', async () => {
      twoFactorRepository.isEnabled.mockResolvedValue(true);

      const result = await service.isEnabled('tenant-1');

      expect(result).toBe(true);
      expect(twoFactorRepository.isEnabled).toHaveBeenCalledWith('tenant-1');
    });

    it('should return false if 2FA is not enabled', async () => {
      twoFactorRepository.isEnabled.mockResolvedValue(false);

      const result = await service.isEnabled('tenant-1');

      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return status when 2FA is enabled', async () => {
      twoFactorRepository.findByTenantId.mockResolvedValue(mockTwoFactor);

      const result = await service.getStatus('tenant-1');

      expect(result.enabled).toBe(true);
      expect(result.enabledAt).toBeDefined();
      expect(result.backupCodesRemaining).toBe(2);
    });

    it('should return disabled status when 2FA not found', async () => {
      twoFactorRepository.findByTenantId.mockResolvedValue(null);

      const result = await service.getStatus('tenant-1');

      expect(result.enabled).toBe(false);
      expect(result.backupCodesRemaining).toBe(0);
    });

    it('should calculate backup codes remaining correctly', async () => {
      const withUsedCodes = {
        ...mockTwoFactor,
        backupCodes: ['code1', 'code2', 'code3'],
        backupCodesUsed: 1,
      };
      twoFactorRepository.findByTenantId.mockResolvedValue(withUsedCodes);

      const result = await service.getStatus('tenant-1');

      expect(result.backupCodesRemaining).toBe(2);
    });
  });
});
