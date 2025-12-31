import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TenantScopedEntity } from '@database/entities/base.entity';

/**
 * Email log entity
 * Tracks all sent emails for auditing and debugging
 */
@Entity('email_logs')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'createdAt'])
@Index(['messageId'])
export class EmailLogEntity extends TenantScopedEntity {
  @Column({ type: 'varchar', length: 255 })
  messageId: string; // Provider message ID

  @Column({ type: 'varchar', length: 100 })
  provider: string; // 'brevo', 'sendgrid', etc.

  @Column({ type: 'varchar', length: 255 })
  to: string; // Recipient email

  @Column({ type: 'varchar', length: 255, nullable: true })
  cc?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bcc?: string;

  @Column({ type: 'varchar', length: 500 })
  subject: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  template?: string; // Template name if used

  @Column({ type: 'varchar', length: 50 })
  status: 'pending' | 'sent' | 'failed' | 'bounced' | 'complained';

  @Column({ type: 'text', nullable: true })
  error?: string; // Error message if failed

  @Column({ type: 'varchar', length: 50, nullable: true })
  errorCode?: string; // Error code

  @Column({ type: 'boolean', default: false })
  retryable: boolean; // Whether error is retryable

  @Column({ type: 'int', default: 0 })
  attemptCount: number; // Number of send attempts

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // Additional metadata

  @Column({ type: 'varchar', length: 255, nullable: true })
  tags?: string; // Comma-separated tags

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date; // When email was actually sent

  @Column({ type: 'timestamp', nullable: true })
  openedAt?: Date; // When email was opened (if tracking enabled)

  @Column({ type: 'timestamp', nullable: true })
  clickedAt?: Date; // When link was clicked (if tracking enabled)
}
