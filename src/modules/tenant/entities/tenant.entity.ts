import { Entity, Column, Index, OneToMany, Check } from 'typeorm';
import { BaseEntity } from '@database/entities/base.entity';

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum KycStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NOT_REQUIRED = 'not_required',
}

/**
 * Tenant entity - Customer accounts/organizations
 */
@Entity('tenants')
@Index('idx_tenants_status', ['status'])
@Index('idx_tenants_kyc_status', ['kycStatus'])
@Index('idx_tenants_created', ['createdAt'])
@Check(`"status" IN ('active', 'suspended', 'deleted')`)
@Check(`"kyc_status" IN ('pending', 'approved', 'rejected', 'not_required')`)
export class TenantEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  // KYC Information
  @Column({
    type: 'varchar',
    length: 50,
    default: KycStatus.PENDING,
    name: 'kyc_status',
  })
  kycStatus: KycStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'kyc_submitted_at' })
  kycSubmittedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'kyc_approved_at' })
  kycApprovedAt?: Date;

  @Column({ type: 'text', nullable: true, name: 'kyc_rejected_reason' })
  kycRejectedReason?: string;

  // Business Information
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'company_name',
  })
  companyName?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'company_registration_number',
  })
  companyRegistrationNumber?: string;

  @Column({ type: 'text', nullable: true, name: 'business_address' })
  businessAddress?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  // Settings
  @Column({
    type: 'varchar',
    length: 3,
    default: 'NGN',
    name: 'default_currency',
  })
  defaultCurrency: string;

  @Column({ type: 'varchar', length: 50, default: 'Africa/Lagos' })
  timezone: string;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Soft delete
  @Column({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deletedAt?: Date;

  // Relations - using string reference to avoid circular dependency
  // ApiKeyEntity is in auth module, imported via TypeORM's string-based relation
  @OneToMany('ApiKeyEntity', 'tenant')
  apiKeys: any[];
}
