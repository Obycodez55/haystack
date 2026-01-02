import { Module } from '@nestjs/common';
import { TypeOrmFeatureModule, BullQueueModule } from '@common/openapi';
import { EmailService } from './services/email.service';
import { EmailQueueService } from './services/email-queue.service';
import { TemplateService } from './services/template.service';
import { BrevoAdapter } from './adapters/brevo.adapter';
import { EmailProcessor } from './processors/email.processor';
import { EmailLogEntity } from './entities/email-log.entity';
import { EmailJobData } from './jobs/email.job.interface';

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
    BullQueueModule<EmailJobData>('email'),
    TypeOrmFeatureModule([EmailLogEntity]),
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
