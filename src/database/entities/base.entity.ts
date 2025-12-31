import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';

/**
 * Base entity with common fields for all entities
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'createdAt', // Explicit column name to match migration
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    name: 'updatedAt', // Explicit column name to match migration
  })
  updatedAt: Date;
}
/**
 * Base entity for tenant-scoped entities
 * Automatically includes tenant_id for multi-tenancy
 */
export abstract class TenantScopedEntity extends BaseEntity {
  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;
}
