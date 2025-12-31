import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailConfig } from '@config/email.config';
import { QueueConfig } from '@config/queue.config';
import { EmailService } from './services/email.service';
import { EmailQueueService } from './services/email-queue.service';
import { TemplateService } from './services/template.service';
import { BrevoAdapter } from './adapters/brevo.adapter';
import { EmailProcessor } from './processors/email.processor';
import { EmailLogEntity } from './entities/email-log.entity';

/**
 * Email Module
 * Provides email sending capabilities with:
 * - Template support (Handlebars)
 * - Multiple provider support (Brevo, etc.)
 * - Queue-based async processing
 * - Email logging and tracking
 * - Retry mechanisms
 */
@Module({
  imports: [
    // Register email queue
    BullModule.registerQueue({
      name: 'email',
    }),
    // Register email log entity
    TypeOrmModule.forFeature([EmailLogEntity]),
  ],
  providers: [
    EmailService,
    EmailQueueService,
    TemplateService,
    BrevoAdapter,
    EmailProcessor,
  ],
  exports: [EmailService, EmailQueueService],
})
export class EmailModule {}
