import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { TenantScopedEntity } from '@common/database/entities/base.entity';
import { TenantEntity } from '@modules/tenant/entities/tenant.entity';

export enum ApiKeyMode {
  TEST = 'test',
  LIVE = 'live',
}

/**
 * API Key entity - API key management for tenant authentication
 */
@Entity('api_keys')
@Index('idx_api_keys_tenant', ['tenantId'])
@Index('idx_api_keys_tenant_mode', ['tenantId', 'mode'])
@Index('idx_api_keys_active', ['isActive', 'mode'])
@Check(`"mode" IN ('test', 'live')`)
export class ApiKeyEntity extends TenantScopedEntity {
  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: TenantEntity;

  @Column({ type: 'varchar', length: 255, unique: true, name: 'key_hash' })
  keyHash: string;

  @Column({ type: 'varchar', length: 20, name: 'key_prefix' })
  keyPrefix: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string;

  @Column({
    type: 'varchar',
    length: 10,
  })
  mode: ApiKeyMode;

  // Usage Tracking
  @Column({ type: 'timestamp', nullable: true, name: 'last_used_at' })
  lastUsedAt?: Date;

  @Column({ type: 'inet', nullable: true, name: 'last_used_ip' })
  lastUsedIp?: string;

  // Status
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'revoked_at' })
  revokedAt?: Date;

  @Column({ type: 'text', nullable: true, name: 'revoked_reason' })
  revokedReason?: string;

  // Expiration
  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt?: Date;
}

