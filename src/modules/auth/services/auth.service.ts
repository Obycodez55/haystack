import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { ApiKeyRepository } from '../repositories/api-key.repository';
import { TwoFactorService } from './two-factor.service';
import { JwtAuthService } from './jwt-auth.service';
import { EmailService } from '@modules/email/services/email.service';
import { EmailHelpers } from '@modules/email/helpers/email.helpers';
import { LoggerService } from '@logging/services/logger.service';
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} from '../utils/password.util';
import { hashApiKey } from '../utils/api-key-hash.util';
import { generateApiKey } from '../utils/api-key-generator.util';
import {
  TenantEntity,
  TenantStatus,
} from '@modules/tenant/entities/tenant.entity';
import { toError } from '@common/utils/error.util';
import { AuthenticationError } from '@common/errors/authentication.error';
import {
  RegisterDto,
  LoginDto,
  VerifyTwoFactorDto,
  AuthResponseDto,
  LoginResponseDto,
  RegisterResponseDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  CreateApiKeyDto,
  ApiKeyResponseDto,
  ApiKeyListDto,
} from '../dto';
import { EmailConfig } from '@config/email.config';

/**
 * Authentication Service
 * Handles registration, login, password reset, email verification, and API key management
 */
@Injectable()
export class AuthService {
  constructor(
    private tenantRepository: TenantRepository,
    private apiKeyRepository: ApiKeyRepository,
    private twoFactorService: TwoFactorService,
    private jwtAuthService: JwtAuthService,
    private emailService: EmailService,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('AuthService');
  }

  /**
   * Register a new tenant
   */
  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    try {
      // Validate password strength
      const passwordValidation = validatePasswordStrength(dto.password);
      if (!passwordValidation.valid) {
        throw new BadRequestException(
          `Password validation failed: ${passwordValidation.errors.join(', ')}`,
        );
      }

      // Check if email already exists
      const existing = await this.tenantRepository.findByEmail(dto.email);
      if (existing) {
        throw new BadRequestException('Email already registered');
      }

      // Hash password
      const passwordHash = await hashPassword(dto.password);

      // Create tenant
      const tenant = await this.tenantRepository.create({
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        companyName: dto.companyName,
        phone: dto.phone,
        status: TenantStatus.ACTIVE,
      });

      // Generate verification token
      const verificationToken = this.jwtAuthService.generateVerificationToken(
        tenant.id,
        tenant.email,
      );

      // Send verification email
      const baseUrl =
        this.configService.get<string>('app.url') || 'http://localhost:3000';
      const emailConfig = this.configService.get<EmailConfig>('email');
      await EmailHelpers.sendVerificationEmail(
        this.emailService,
        tenant.email,
        {
          userName: tenant.name,
          verificationUrl: `${baseUrl}/auth/verify-email?token=${verificationToken}`,
          expiresIn: '24 hours',
          supportEmail: emailConfig?.from?.email || 'support@haystack.com',
        },
        {
          tenantId: tenant.id,
          logEmail: true,
        },
      );

      this.logger.log('Tenant registered successfully', {
        tenantId: tenant.id,
      });

      return {
        tenantId: tenant.id,
        email: tenant.email,
        message:
          'Registration successful. Please check your email to verify your account.',
      };
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Registration failed', errorObj, { email: dto.email });
      throw error;
    }
  }

  /**
   * Login tenant
   * Returns auth tokens if 2FA is disabled, or temporary token if 2FA is enabled
   */
  async login(dto: LoginDto): Promise<LoginResponseDto> {
    try {
      // Find tenant by email
      const tenant = await this.tenantRepository.findByEmail(
        dto.email.toLowerCase(),
      );
      if (!tenant) {
        // Use accountNotFound for security (same message as invalidCredentials to prevent email enumeration)
        throw AuthenticationError.accountNotFound();
      }

      // Verify password
      const isPasswordValid = await comparePassword(
        dto.password,
        tenant.passwordHash,
      );
      if (!isPasswordValid) {
        throw AuthenticationError.invalidCredentials();
      }

      // Check if tenant is active
      if (tenant.status !== TenantStatus.ACTIVE) {
        throw new UnauthorizedException('Account is not active');
      }

      // Check if 2FA is enabled
      const is2FAEnabled = await this.twoFactorService.isEnabled(tenant.id);

      if (is2FAEnabled) {
        // Generate temporary token for 2FA verification
        const temporaryToken = this.jwtAuthService.generateTemporaryToken(
          tenant.id,
          tenant.email,
        );

        return {
          requires2FA: true,
          temporaryToken,
          temporaryTokenExpiresIn: 300, // 5 minutes
        };
      }

      // Generate JWT tokens
      const authResponse = this.generateAuthResponse(tenant);

      return {
        auth: authResponse,
      };
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Login failed', errorObj, { email: dto.email });
      throw error;
    }
  }

  /**
   * Verify 2FA code and complete login
   */
  async verifyTwoFactor(dto: VerifyTwoFactorDto): Promise<AuthResponseDto> {
    try {
      // Verify temporary token
      const payload = this.jwtAuthService.verifyToken<{
        sub: string;
        email: string;
        type: string;
      }>(dto.temporaryToken);

      if (!payload || payload.type !== 'temporary') {
        throw new UnauthorizedException('Invalid or expired temporary token');
      }

      const tenantId = payload.sub;
      const tenant = await this.tenantRepository.findById(tenantId);
      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      // Verify 2FA code (TOTP or backup code)
      const isTOTPValid = await this.twoFactorService.verifyCode(
        tenantId,
        dto.code,
      );
      const isBackupCodeValid = await this.twoFactorService.verifyBackupCode(
        tenantId,
        dto.code,
      );

      if (!isTOTPValid && !isBackupCodeValid) {
        // Could be either TOTP or backup code, but we don't reveal which
        throw AuthenticationError.invalidTotpCode();
      }

      // Generate JWT tokens
      return this.generateAuthResponse(tenant);
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('2FA verification failed', errorObj);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    try {
      // Verify refresh token
      const payload = this.jwtAuthService.verifyRefreshToken<{
        sub: string;
        email: string;
      }>(dto.refreshToken);

      if (!payload) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Get tenant
      const tenant = await this.tenantRepository.findById(payload.sub);
      if (!tenant || tenant.status !== TenantStatus.ACTIVE) {
        throw new UnauthorizedException('Tenant not found or inactive');
      }

      // Generate new tokens
      return this.generateAuthResponse(tenant);
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Token refresh failed', errorObj);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    try {
      const tenant = await this.tenantRepository.findByEmail(
        dto.email.toLowerCase(),
      );
      if (!tenant) {
        // Don't reveal if email exists (security best practice)
        return {
          message:
            'If an account exists with this email, a password reset link has been sent.',
        };
      }

      // Generate reset token
      const resetToken = this.jwtAuthService.generateResetToken(
        tenant.id,
        tenant.email,
      );

      // Send reset email
      const baseUrl = this.configService.get<string>('app.url');
      const emailConfig = this.configService.get<EmailConfig>('email')!;
      await EmailHelpers.sendPasswordResetEmail(
        this.emailService,
        tenant.email,
        {
          userName: tenant.name,
          resetUrl: `${baseUrl}/auth/reset-password?token=${resetToken}`,
          expiresIn: '1 hour',
          supportEmail: emailConfig.from.email,
        },
        {
          tenantId: tenant.id,
          logEmail: true,
        },
      );

      return {
        message:
          'If an account exists with this email, a password reset link has been sent.',
      };
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Password reset request failed', errorObj, {
        email: dto.email,
      });
      throw error;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    try {
      // Verify token
      const payload = this.jwtAuthService.verifyToken<{
        sub: string;
        email: string;
        type: string;
      }>(dto.token);

      if (!payload || payload.type !== 'reset') {
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(dto.newPassword);
      if (!passwordValidation.valid) {
        throw new BadRequestException(
          `Password validation failed: ${passwordValidation.errors.join(', ')}`,
        );
      }

      // Update password
      const passwordHash = await hashPassword(dto.newPassword);
      await this.tenantRepository.update(payload.sub, {
        passwordHash,
      });

      this.logger.log('Password reset successful', { tenantId: payload.sub });

      return {
        message:
          'Password reset successful. You can now login with your new password.',
      };
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Password reset failed', errorObj);
      throw error;
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    try {
      // Verify token
      const payload = this.jwtAuthService.verifyToken<{
        sub: string;
        email: string;
        type: string;
      }>(dto.token);

      if (!payload || payload.type !== 'verification') {
        throw new UnauthorizedException(
          'Invalid or expired verification token',
        );
      }

      // Get tenant
      const tenant = await this.tenantRepository.findById(payload.sub);
      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      // Check if email is already verified
      if (tenant.emailVerifiedAt) {
        return {
          message: 'Email is already verified.',
        };
      }

      // Verify that the email in token matches tenant email
      if (tenant.email !== payload.email) {
        throw new UnauthorizedException(
          'Email verification token does not match tenant email',
        );
      }

      // Mark email as verified
      await this.tenantRepository.update(payload.sub, {
        emailVerifiedAt: new Date(),
      });

      this.logger.log('Email verified successfully', {
        tenantId: payload.sub,
        email: payload.email,
      });

      return {
        message: 'Email verified successfully.',
      };
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Email verification failed', errorObj);
      throw error;
    }
  }

  /**
   * Create API key
   */
  async createApiKey(
    tenantId: string,
    dto: CreateApiKeyDto,
  ): Promise<ApiKeyResponseDto> {
    try {
      // Generate API key
      const { key, prefix } = generateApiKey(dto.mode);

      // Hash the key
      const keyHash = await hashApiKey(key);

      // Create API key entity
      const apiKey = await this.apiKeyRepository.create({
        tenantId,
        keyHash,
        keyPrefix: prefix,
        name: dto.name,
        mode: dto.mode,
        isActive: true,
      } as any);

      this.logger.log('API key created', {
        tenantId,
        apiKeyId: apiKey.id,
        mode: dto.mode,
      });

      return {
        id: apiKey.id,
        name: apiKey.name || '',
        mode: apiKey.mode,
        key, // Only shown once
        keyPrefix: apiKey.keyPrefix,
        isActive: apiKey.isActive,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      };
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('API key creation failed', errorObj, { tenantId });
      throw error;
    }
  }

  /**
   * List API keys for tenant
   */
  async listApiKeys(tenantId: string): Promise<ApiKeyListDto[]> {
    try {
      const apiKeys = await this.apiKeyRepository.findAll(tenantId);

      return apiKeys.map((key) => ({
        id: key.id,
        name: key.name || '',
        mode: key.mode,
        keyPrefix: key.keyPrefix,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
      }));
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Failed to list API keys', errorObj, { tenantId });
      throw error;
    }
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(
    tenantId: string,
    apiKeyId: string,
    reason?: string,
  ): Promise<{ message: string }> {
    try {
      const apiKey = await this.apiKeyRepository.findById(apiKeyId);

      if (!apiKey || apiKey.tenantId !== tenantId) {
        throw new NotFoundException('API key not found');
      }

      await this.apiKeyRepository.update(apiKeyId, tenantId, {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason,
      } as any);

      this.logger.log('API key revoked', {
        tenantId,
        apiKeyId,
        reason,
      });

      return {
        message: 'API key revoked successfully',
      };
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('API key revocation failed', errorObj, {
        tenantId,
        apiKeyId,
      });
      throw error;
    }
  }

  /**
   * Generate JWT tokens for tenant
   */
  private generateAuthResponse(tenant: TenantEntity): AuthResponseDto {
    // Generate tokens using JwtAuthService
    const tokens = this.jwtAuthService.generateTokens(
      tenant.id,
      tenant.email,
      tenant.name,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        status: tenant.status,
        kycStatus: tenant.kycStatus,
        companyName: tenant.companyName,
        defaultCurrency: tenant.defaultCurrency,
        timezone: tenant.timezone,
      },
    };
  }
}
