import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwoFactorRepository } from '../repositories/two-factor.repository';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { EmailService } from '@modules/email/services/email.service';
import { EmailHelpers } from '@modules/email/helpers/email.helpers';
import { LoggerService } from '@logging/services/logger.service';
import {
  generateSecret,
  generateQRCodeDataUri,
  verifyTOTPCode,
  generateBackupCodes,
} from '../utils/totp.util';
import { hashPassword, comparePassword } from '../utils/password.util';
import { toError } from '@common/utils/error.util';
import { AuthenticationError } from '@common/errors/authentication.error';
import { createEncryptionUtil, EncryptionUtil } from '../utils/encryption.util';

/**
 * Two-Factor Authentication Service
 * Handles TOTP setup, verification, and management
 */
@Injectable()
export class TwoFactorService {
  private readonly issuer: string;
  private readonly encryptionUtil: EncryptionUtil;

  constructor(
    private twoFactorRepository: TwoFactorRepository,
    private tenantRepository: TenantRepository,
    private emailService: EmailService,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('TwoFactorService');
    this.issuer = this.configService.get<string>('app.name')!;
    this.encryptionUtil = createEncryptionUtil(configService);
  }

  /**
   * Generate secret and QR code for 2FA setup
   * Returns secret, QR code, and backup codes
   */
  async generateSecret(tenantId: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    try {
      // Check if 2FA is already enabled
      const existing = await this.twoFactorRepository.findByTenantId(tenantId);
      if (existing?.isEnabled) {
        throw new BadRequestException('2FA is already enabled');
      }

      // Get tenant for email
      const tenant = await this.tenantRepository.findById(tenantId);
      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      // Generate secret and backup codes
      const secret = generateSecret();
      const backupCodes = generateBackupCodes(10);

      // Generate QR code
      const qrCodeUrl = await generateQRCodeDataUri(
        secret,
        tenant.email,
        this.issuer,
      );

      // Send setup email
      await EmailHelpers.sendTwoFactorSetupEmail(
        this.emailService,
        tenant.email,
        {
          userName: tenant.name,
          qrCodeUrl,
          secret,
          backupCodes,
          supportEmail: this.configService.get<string>('email.from.email')!,
        },
        {
          tenantId,
          logEmail: true,
        },
      );

      return {
        secret,
        qrCodeUrl,
        backupCodes,
      };
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Failed to generate 2FA secret', errorObj, {
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Verify TOTP code during setup and enable 2FA
   */
  async verifySetup(
    tenantId: string,
    secret: string,
    code: string,
  ): Promise<void> {
    try {
      // Verify code
      const isValid = verifyTOTPCode(secret, code);
      if (!isValid) {
        throw AuthenticationError.invalidTotpCode();
      }

      // Get tenant
      const tenant = await this.tenantRepository.findById(tenantId);
      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      // Generate backup codes
      const backupCodes = generateBackupCodes(10);

      // Hash backup codes (one-way, for verification)
      // Note: Using hashPassword for backup codes (they're like passwords)
      const hashedBackupCodes = await Promise.all(
        backupCodes.map((code) => hashPassword(code)),
      );

      // Encrypt secret before storing
      const encryptedSecret = this.encryptionUtil.encrypt(secret);

      // Create or update 2FA entity
      const existing = await this.twoFactorRepository.findByTenantId(tenantId);

      if (existing) {
        // Update existing
        await this.twoFactorRepository.update(existing.id, tenantId, {
          secret: encryptedSecret,
          isEnabled: true,
          enabledAt: new Date(),
          backupCodes: hashedBackupCodes,
          backupCodesUsed: 0,
        } as any);
      } else {
        // Create new
        await this.twoFactorRepository.create({
          tenantId,
          secret: encryptedSecret,
          isEnabled: true,
          enabledAt: new Date(),
          backupCodes: hashedBackupCodes,
          backupCodesUsed: 0,
        } as any);
      }

      this.logger.log('2FA enabled successfully', { tenantId });
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Failed to verify 2FA setup', errorObj, {
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Verify TOTP code during login
   */
  async verifyCode(tenantId: string, code: string): Promise<boolean> {
    try {
      const twoFactor = await this.twoFactorRepository.findByTenantId(tenantId);
      if (!twoFactor || !twoFactor.isEnabled) {
        return false;
      }

      // Decrypt secret
      const decryptedSecret = this.encryptionUtil.decrypt(twoFactor.secret);

      // Verify TOTP code
      const isValid = verifyTOTPCode(decryptedSecret, code);
      if (isValid) {
        // Update last verified timestamp
        await this.twoFactorRepository.updateLastVerified(tenantId);
        return true;
      }

      return false;
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Failed to verify 2FA code', errorObj, { tenantId });
      return false;
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(tenantId: string, code: string): Promise<boolean> {
    try {
      const twoFactor = await this.twoFactorRepository.findByTenantId(tenantId);
      if (!twoFactor || !twoFactor.isEnabled || !twoFactor.backupCodes) {
        return false;
      }

      // Compare code with hashed backup codes
      // Note: Using comparePassword for backup codes (they're like passwords)
      for (let i = 0; i < twoFactor.backupCodes.length; i++) {
        const isValid = await comparePassword(code, twoFactor.backupCodes[i]);
        if (isValid) {
          // Remove used backup code
          const updatedCodes = [...twoFactor.backupCodes];
          updatedCodes.splice(i, 1);

          // Update entity
          await this.twoFactorRepository.update(twoFactor.id, tenantId, {
            backupCodes: updatedCodes,
            backupCodesUsed: twoFactor.backupCodesUsed + 1,
            lastVerifiedAt: new Date(),
          } as any);

          return true;
        }
      }

      return false;
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Failed to verify backup code', errorObj, {
        tenantId,
      });
      return false;
    }
  }

  /**
   * Disable 2FA (requires password verification)
   */
  async disable(tenantId: string, password: string): Promise<void> {
    try {
      // Get tenant and verify password
      const tenant = await this.tenantRepository.findById(tenantId);
      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      const isPasswordValid = await comparePassword(
        password,
        tenant.passwordHash,
      );
      if (!isPasswordValid) {
        throw AuthenticationError.invalidCredentials();
      }

      // Disable 2FA
      const twoFactor = await this.twoFactorRepository.findByTenantId(tenantId);
      if (!twoFactor) {
        throw new NotFoundException('2FA not set up');
      }

      await this.twoFactorRepository.update(twoFactor.id, tenantId, {
        isEnabled: false,
        backupCodes: null,
        backupCodesUsed: 0,
      } as any);

      this.logger.log('2FA disabled successfully', { tenantId });
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Failed to disable 2FA', errorObj, { tenantId });
      throw error;
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(tenantId: string): Promise<string[]> {
    try {
      const twoFactor = await this.twoFactorRepository.findByTenantId(tenantId);
      if (!twoFactor || !twoFactor.isEnabled) {
        throw new BadRequestException('2FA is not enabled');
      }

      // Generate new backup codes
      // Note: Using hashPassword for backup codes (they're like passwords)
      const backupCodes = generateBackupCodes(10);
      const hashedBackupCodes = await Promise.all(
        backupCodes.map((code) => hashPassword(code)),
      );

      // Update entity
      await this.twoFactorRepository.update(twoFactor.id, tenantId, {
        backupCodes: hashedBackupCodes,
        backupCodesUsed: 0,
      } as any);

      // Send email with new codes
      const tenant = await this.tenantRepository.findById(tenantId);
      if (tenant) {
        // Decrypt secret for email (only for display, not stored)
        const decryptedSecret = this.encryptionUtil.decrypt(twoFactor.secret);

        await EmailHelpers.sendTwoFactorSetupEmail(
          this.emailService,
          tenant.email,
          {
            userName: tenant.name,
            qrCodeUrl: '', // Not needed for regeneration
            secret: decryptedSecret, // Decrypted secret for display
            backupCodes,
            supportEmail:
              this.configService.get<string>('email.from.email') ||
              'support@haystack.com',
          },
          {
            tenantId,
            logEmail: true,
          },
        );
      }

      return backupCodes;
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Failed to regenerate backup codes', errorObj, {
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Check if 2FA is enabled for tenant
   */
  async isEnabled(tenantId: string): Promise<boolean> {
    return this.twoFactorRepository.isEnabled(tenantId);
  }

  /**
   * Get 2FA status
   */
  async getStatus(tenantId: string): Promise<{
    enabled: boolean;
    enabledAt?: Date;
    backupCodesRemaining: number;
  }> {
    const twoFactor = await this.twoFactorRepository.findByTenantId(tenantId);
    if (!twoFactor) {
      return {
        enabled: false,
        backupCodesRemaining: 0,
      };
    }

    return {
      enabled: twoFactor.isEnabled,
      enabledAt: twoFactor.enabledAt,
      backupCodesRemaining:
        (twoFactor.backupCodes?.length || 0) - twoFactor.backupCodesUsed,
    };
  }
}
