import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { EmailJobData } from '../jobs/email.job.interface';
import { EmailService } from '../services/email.service';
import { EmailResult } from '../interfaces';
import { LoggerService } from '@common/logging/services/logger.service';
import { toError } from '@common/utils/error.util';

/**
 * Email processor
 * Processes email jobs from the queue
 */
@Processor('email')
@Injectable()
export class EmailProcessor {
  constructor(
    private emailService: EmailService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('EmailProcessor');
  }

  /**
   * Process email job
   * This method is called automatically by BullMQ for jobs in the 'email' queue
   * The method name must match the job name ('send-email')
   */
  async process(job: Job<EmailJobData>) {
    const { options, template, templateVariables, tenantId, metadata } =
      job.data;

    this.logger.log(`Processing email job ${job.id}`, {
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      template,
      attempt: job.attemptsMade + 1,
    });

    try {
      // Set tenant context if provided
      if (tenantId) {
        // Note: You'll need to implement tenant context setting
        // This depends on your tenant context implementation
      }

      // Send email with template if provided, otherwise send directly
      let result: EmailResult;
      if (template && templateVariables) {
        // Use type assertion since job data has union types
        result = await this.emailService.sendWithTemplate({
          to: options.to,
          cc: options.cc,
          bcc: options.bcc,
          from: options.from,
          replyTo: options.replyTo,
          attachments: options.attachments,
          priority: options.priority,
          scheduledAt: options.scheduledAt,
          tags: options.tags,
          metadata: {
            ...metadata,
            jobId: job.id,
            attempt: job.attemptsMade + 1,
          },
          template: template as any,
          templateVariables: templateVariables as any,
          tenantId,
          userId: metadata?.userId,
          logEmail: metadata?.logEmail,
        });
      } else {
        // Exclude template fields for direct send
        const {
          template: _,
          templateVariables: __,
          ...directOptions
        } = options;
        result = await this.emailService.sendDirect({
          ...directOptions,
          metadata: {
            ...metadata,
            jobId: job.id,
            attempt: job.attemptsMade + 1,
          },
          tenantId,
          userId: metadata?.userId,
          logEmail: metadata?.logEmail,
        });
      }

      if (!result.success && result.error?.retryable) {
        // Retryable error - will be retried by BullMQ
        throw new Error(result.error.message);
      }

      if (!result.success) {
        // Non-retryable error - mark as failed
        this.logger.error(
          `Email job ${job.id} failed with non-retryable error`,
          new Error(result.error?.message || 'Unknown error'),
          {
            errorCode: result.error?.code,
            to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
          },
        );
        return result;
      }

      this.logger.log(`Email job ${job.id} completed successfully`, {
        messageId: result.messageId,
        provider: result.provider,
      });

      return result;
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error(`Email job ${job.id} failed`, errorObj, {
        attempt: job.attemptsMade + 1,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      });

      // Re-throw to trigger retry mechanism
      throw errorObj;
    }
  }
}
