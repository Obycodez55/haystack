import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepository } from '../repositories/tenant.repository';
import { LoggerService } from '@logging/services/logger.service';
import {
  TenantEntity,
  TenantStatus,
  KycStatus,
} from '../entities/tenant.entity';
import { TenantError } from '@common/errors/tenant.error';
import { toError } from '@common/utils/error.util';
import {
  TenantProfileDto,
  TenantSettingsDto,
  KycStatusDto,
  UpdateProfileDto,
  UpdateSettingsDto,
  KycSubmissionDto,
} from '../dto';

/**
 * Supported currencies (ISO 4217)
 * Can be expanded based on business requirements
 */
const SUPPORTED_CURRENCIES = [
  'NGN', // Nigerian Naira
  'USD', // US Dollar
  'EUR', // Euro
  'GBP', // British Pound
  'KES', // Kenyan Shilling
  'GHS', // Ghanaian Cedi
  'ZAR', // South African Rand
] as const;

/**
 * Validates IANA timezone identifier
 * Uses a simple check - in production, consider using a timezone library
 */
function isValidTimezone(timezone: string): boolean {
  try {
    // Basic validation: check if timezone can be used
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Tenant Service
 * Handles tenant profile, settings, and KYC management
 */
@Injectable()
export class TenantService {
  constructor(
    private tenantRepository: TenantRepository,
    private logger: LoggerService,
  ) {
    this.logger.setContext('TenantService');
  }

  /**
   * Get tenant profile
   */
  async getProfile(tenantId: string): Promise<TenantProfileDto> {
    try {
      const tenant = await this.tenantRepository.findById(tenantId);
      if (!tenant) {
        throw TenantError.notFound(tenantId);
      }

      this.validateTenantStatus(tenant);

      return this.toProfileDto(tenant);
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Failed to get tenant profile', errorObj, {
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Update tenant profile
   */
  async updateProfile(
    tenantId: string,
    dto: UpdateProfileDto,
  ): Promise<TenantProfileDto> {
    try {
      const tenant = await this.tenantRepository.findById(tenantId);
      if (!tenant) {
        throw TenantError.notFound(tenantId);
      }

      this.validateTenantStatus(tenant);

      // Update only provided fields
      const updates: Partial<TenantEntity> = {};
      if (dto.name !== undefined) updates.name = dto.name;
      if (dto.companyName !== undefined) updates.companyName = dto.companyName;
      if (dto.companyRegistrationNumber !== undefined)
        updates.companyRegistrationNumber = dto.companyRegistrationNumber;
      if (dto.businessAddress !== undefined)
        updates.businessAddress = dto.businessAddress;
      if (dto.phone !== undefined) updates.phone = dto.phone;

      const updated = await this.tenantRepository.update(tenantId, updates);

      this.logger.log('Tenant profile updated', { tenantId });

      return this.toProfileDto(updated);
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Failed to update tenant profile', errorObj, {
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Get tenant settings
   */
  async getSettings(tenantId: string): Promise<TenantSettingsDto> {
    try {
      const tenant = await this.tenantRepository.findById(tenantId);
      if (!tenant) {
        throw TenantError.notFound(tenantId);
      }

      this.validateTenantStatus(tenant);

      return {
        defaultCurrency: tenant.defaultCurrency,
        timezone: tenant.timezone,
      };
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Failed to get tenant settings', errorObj, {
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Update tenant settings
   */
  async updateSettings(
    tenantId: string,
    dto: UpdateSettingsDto,
  ): Promise<TenantSettingsDto> {
    try {
      const tenant = await this.tenantRepository.findById(tenantId);
      if (!tenant) {
        throw TenantError.notFound(tenantId);
      }

      this.validateTenantStatus(tenant);

      // Validate currency if provided
      if (dto.defaultCurrency) {
        if (!SUPPORTED_CURRENCIES.includes(dto.defaultCurrency as any)) {
          throw TenantError.invalidCurrency(dto.defaultCurrency, [
            ...SUPPORTED_CURRENCIES,
          ]);
        }
      }

      // Validate timezone if provided
      if (dto.timezone) {
        if (!isValidTimezone(dto.timezone)) {
          throw TenantError.invalidTimezone(dto.timezone);
        }
      }

      const updates: Partial<TenantEntity> = {};
      if (dto.defaultCurrency !== undefined)
        updates.defaultCurrency = dto.defaultCurrency;
      if (dto.timezone !== undefined) updates.timezone = dto.timezone;

      const updated = await this.tenantRepository.update(tenantId, updates);

      this.logger.log('Tenant settings updated', {
        tenantId,
        updates: Object.keys(updates),
      });

      return {
        defaultCurrency: updated.defaultCurrency,
        timezone: updated.timezone,
      };
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Failed to update tenant settings', errorObj, {
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Submit KYC information
   */
  async submitKyc(
    tenantId: string,
    dto: KycSubmissionDto,
  ): Promise<KycStatusDto> {
    try {
      const tenant = await this.tenantRepository.findById(tenantId);
      if (!tenant) {
        throw TenantError.notFound(tenantId);
      }

      this.validateTenantStatus(tenant);

      // Check if KYC is already approved or rejected
      if (
        tenant.kycStatus === KycStatus.APPROVED ||
        tenant.kycStatus === KycStatus.REJECTED
      ) {
        // Allow resubmission if rejected, but log it
        if (tenant.kycStatus === KycStatus.REJECTED) {
          this.logger.log('KYC resubmission after rejection', {
            tenantId,
            previousReason: tenant.kycRejectedReason,
          });
        } else {
          throw TenantError.kycAlreadySubmitted();
        }
      }

      // Update tenant with KYC information
      const updates: Partial<TenantEntity> = {
        companyName: dto.companyName,
        companyRegistrationNumber: dto.companyRegistrationNumber,
        businessAddress: dto.businessAddress,
        kycStatus: KycStatus.PENDING,
        kycSubmittedAt: new Date(),
        kycRejectedReason: undefined, // Clear previous rejection reason
      };

      // Merge metadata if provided
      if (dto.metadata) {
        updates.metadata = {
          ...tenant.metadata,
          ...dto.metadata,
        };
      }

      const updated = await this.tenantRepository.update(tenantId, updates);

      this.logger.log('KYC submitted', { tenantId });

      return this.toKycStatusDto(updated);
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Failed to submit KYC', errorObj, { tenantId });
      throw error;
    }
  }

  /**
   * Get KYC status
   */
  async getKycStatus(tenantId: string): Promise<KycStatusDto> {
    try {
      const tenant = await this.tenantRepository.findById(tenantId);
      if (!tenant) {
        throw TenantError.notFound(tenantId);
      }

      this.validateTenantStatus(tenant);

      return this.toKycStatusDto(tenant);
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Failed to get KYC status', errorObj, { tenantId });
      throw error;
    }
  }

  /**
   * Validate tenant status (ensure tenant is active)
   */
  private validateTenantStatus(tenant: TenantEntity): void {
    if (tenant.status === TenantStatus.SUSPENDED) {
      throw TenantError.suspended();
    }
    if (tenant.status === TenantStatus.DELETED) {
      throw TenantError.deleted();
    }
  }

  /**
   * Convert entity to profile DTO
   */
  private toProfileDto(tenant: TenantEntity): TenantProfileDto {
    return {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      isEmailVerified: !!tenant.emailVerifiedAt,
      status: tenant.status,
      companyName: tenant.companyName,
      companyRegistrationNumber: tenant.companyRegistrationNumber,
      businessAddress: tenant.businessAddress,
      phone: tenant.phone,
      defaultCurrency: tenant.defaultCurrency,
      timezone: tenant.timezone,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  /**
   * Convert entity to KYC status DTO
   */
  private toKycStatusDto(tenant: TenantEntity): KycStatusDto {
    return {
      status: tenant.kycStatus,
      submittedAt: tenant.kycSubmittedAt,
      approvedAt: tenant.kycApprovedAt,
      rejectedReason: tenant.kycRejectedReason,
    };
  }
}
