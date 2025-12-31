import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TenantScopedEntity } from '@database/entities/base.entity';
import { TenantEntity } from '@modules/tenant/entities/tenant.entity';

/**
 * Two-Factor Authentication entity
 * Stores TOTP secrets and backup codes for tenants
 */
@Entity('two_factor_auth')
@Index('idx_two_factor_tenant', ['tenantId'])
@Index('idx_two_factor_enabled', ['tenantId', 'isEnabled'])
export class TwoFactorEntity extends TenantScopedEntity {
  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: TenantEntity;

  /**
   * Encrypted TOTP secret (AES-256 encrypted)
   * Never store plaintext secrets
   */
  @Column({ type: 'varchar', length: 255 })
  secret: string;

  /**
   * Whether 2FA is enabled for this tenant
   */
  @Column({ type: 'boolean', default: false, name: 'is_enabled' })
  isEnabled: boolean;

  /**
   * When 2FA was enabled
   */
  @Column({ type: 'timestamp', nullable: true, name: 'enabled_at' })
  enabledAt?: Date;

  /**
   * Hashed backup codes (bcrypt hashed, one-way)
   * Stored as JSON array of hashes
   */
  @Column({ type: 'jsonb', nullable: true, name: 'backup_codes' })
  backupCodes?: string[];

  /**
   * Number of backup codes used
   * Track to detect abuse
   */
  @Column({ type: 'int', default: 0, name: 'backup_codes_used' })
  backupCodesUsed: number;

  /**
   * Last time 2FA was successfully verified
   * Useful for security monitoring
   */
  @Column({ type: 'timestamp', nullable: true, name: 'last_verified_at' })
  lastVerifiedAt?: Date;
}
