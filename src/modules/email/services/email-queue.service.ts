import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EmailJobData } from '../jobs/email.job.interface';
import { LoggerService } from '@common/logging/services/logger.service';

/**
 * Email queue service
 * Handles adding emails to the queue for async processing
 */
@Injectable()
export class EmailQueueService {
  constructor(
    @InjectQueue('email') private emailQueue: Queue<EmailJobData>,
    private logger: LoggerService,
  ) {
    this.logger.setContext('EmailQueueService');
  }

  /**
   * Add email job to queue
   */
  async addEmailJob(
    data: EmailJobData,
    options?: {
      priority?: number;
      delay?: number; // Delay in milliseconds
      attempts?: number;
    },
  ) {
    try {
      const job = await this.emailQueue.add('send-email', data, {
        priority: options?.priority || 1,
        delay: options?.delay,
        attempts: options?.attempts,
      });

      this.logger.debug('Email job added to queue', {
        jobId: job.id,
        to: Array.isArray(data.options.to)
          ? data.options.to.join(', ')
          : data.options.to,
        subject: data.options.subject,
      });

      return job;
    } catch (error) {
      this.logger.error('Failed to add email job to queue', error, {
        to: Array.isArray(data.options.to)
          ? data.options.to.join(', ')
          : data.options.to,
        subject: data.options.subject,
      });
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
    };
  }
}
