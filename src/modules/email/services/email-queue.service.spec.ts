import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { EmailQueueService } from './email-queue.service';
import { LoggerService } from '@logging/services/logger.service';
import { Queue } from 'bullmq';
import { EmailJobData } from '../jobs/email.job.interface';

describe('EmailQueueService', () => {
  let service: EmailQueueService;
  let emailQueue: jest.Mocked<Queue<EmailJobData>>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    emailQueue = {
      add: jest.fn().mockResolvedValue({
        id: 'job-123',
        data: {},
      }),
      getWaitingCount: jest.fn().mockResolvedValue(5),
      getActiveCount: jest.fn().mockResolvedValue(2),
      getCompletedCount: jest.fn().mockResolvedValue(100),
      getFailedCount: jest.fn().mockResolvedValue(3),
    } as any;

    logger = {
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      setContext: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailQueueService,
        {
          provide: getQueueToken('email'),
          useValue: emailQueue,
        },
        {
          provide: LoggerService,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get<EmailQueueService>(EmailQueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addEmailJob', () => {
    it('should add email job to queue', async () => {
      const jobData: EmailJobData = {
        options: {
          to: 'test@example.com',
          subject: 'Test Subject',
          html: '<p>Test HTML</p>',
        },
        tenantId: 'tenant-123',
      };

      const job = await service.addEmailJob(jobData);

      expect(job.id).toBe('job-123');
      expect(emailQueue.add).toHaveBeenCalledWith(
        'send-email',
        jobData,
        expect.objectContaining({
          priority: 1,
        }),
      );
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should add job with custom priority', async () => {
      const jobData: EmailJobData = {
        options: {
          to: 'test@example.com',
          subject: 'Test Subject',
          html: '<p>Test HTML</p>',
        },
      };

      await service.addEmailJob(jobData, { priority: 10 });

      expect(emailQueue.add).toHaveBeenCalledWith(
        'send-email',
        jobData,
        expect.objectContaining({
          priority: 10,
        }),
      );
    });

    it('should add job with delay', async () => {
      const jobData: EmailJobData = {
        options: {
          to: 'test@example.com',
          subject: 'Test Subject',
          html: '<p>Test HTML</p>',
        },
      };

      await service.addEmailJob(jobData, { delay: 5000 });

      expect(emailQueue.add).toHaveBeenCalledWith(
        'send-email',
        jobData,
        expect.objectContaining({
          delay: 5000,
        }),
      );
    });

    it('should add job with custom attempts', async () => {
      const jobData: EmailJobData = {
        options: {
          to: 'test@example.com',
          subject: 'Test Subject',
          html: '<p>Test HTML</p>',
        },
      };

      await service.addEmailJob(jobData, { attempts: 5 });

      expect(emailQueue.add).toHaveBeenCalledWith(
        'send-email',
        jobData,
        expect.objectContaining({
          attempts: 5,
        }),
      );
    });

    it('should handle queue errors', async () => {
      emailQueue.add = jest
        .fn()
        .mockRejectedValue(new Error('Queue connection failed'));

      const jobData: EmailJobData = {
        options: {
          to: 'test@example.com',
          subject: 'Test Subject',
          html: '<p>Test HTML</p>',
        },
      };

      await expect(service.addEmailJob(jobData)).rejects.toThrow(
        'Queue connection failed',
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle multiple recipients in logging', async () => {
      const jobData: EmailJobData = {
        options: {
          to: ['test1@example.com', 'test2@example.com'],
          subject: 'Test Subject',
          html: '<p>Test HTML</p>',
        },
      };

      await service.addEmailJob(jobData);

      expect(logger.debug).toHaveBeenCalledWith(
        'Email job added to queue',
        expect.objectContaining({
          to: 'test1@example.com, test2@example.com',
        }),
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
      });
      expect(emailQueue.getWaitingCount).toHaveBeenCalled();
      expect(emailQueue.getActiveCount).toHaveBeenCalled();
      expect(emailQueue.getCompletedCount).toHaveBeenCalled();
      expect(emailQueue.getFailedCount).toHaveBeenCalled();
    });
  });
});
