import { Test, TestingModule } from '@nestjs/testing';
import { EmailProcessor } from './email.processor';
import { EmailService } from '../services/email.service';
import { LoggerService } from '@logging/services/logger.service';
import { Job } from 'bullmq';
import { EmailJobData } from '../jobs/email.job.interface';
import { EmailResult } from '../interfaces';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let emailService: jest.Mocked<EmailService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    emailService = {
      sendWithTemplate: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
        provider: 'brevo',
        sentAt: new Date(),
      } as EmailResult),
      sendDirect: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
        provider: 'brevo',
        sentAt: new Date(),
      } as EmailResult),
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
        EmailProcessor,
        {
          provide: EmailService,
          useValue: emailService,
        },
        {
          provide: LoggerService,
          useValue: logger,
        },
      ],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should process email job with template successfully', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          options: {
            to: 'test@example.com',
            subject: 'Test Subject',
          },
          template: 'email-verification' as const,
          templateVariables: {
            userName: 'John Doe',
            verificationUrl: 'https://example.com/verify',
            expiresIn: '24 hours',
            supportEmail: 'support@haystack.com',
          },
          tenantId: 'tenant-123',
          metadata: {},
        } as EmailJobData,
        attemptsMade: 0,
      } as Job<EmailJobData>;

      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      expect(emailService.sendWithTemplate).toHaveBeenCalled();
      expect(emailService.sendDirect).not.toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalled();
    });

    it('should process email job without template successfully', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          options: {
            to: 'test@example.com',
            subject: 'Test Subject',
            html: '<p>Test HTML</p>',
            text: 'Test Text',
          },
          tenantId: 'tenant-123',
          metadata: {},
        } as EmailJobData,
        attemptsMade: 0,
      } as Job<EmailJobData>;

      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      expect(emailService.sendDirect).toHaveBeenCalled();
      expect(emailService.sendWithTemplate).not.toHaveBeenCalled();
    });

    it('should include job metadata in email options', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          options: {
            to: 'test@example.com',
            subject: 'Test Subject',
            html: '<p>Test HTML</p>',
          },
          metadata: {
            userId: 'user-123',
            customField: 'custom-value',
          },
        } as EmailJobData,
        attemptsMade: 1,
      } as Job<EmailJobData>;

      await processor.process(mockJob);

      expect(emailService.sendDirect).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            jobId: 'job-123',
            attempt: 2,
            userId: 'user-123',
            customField: 'custom-value',
          }),
        }),
      );
    });

    it('should throw error for retryable failures', async () => {
      emailService.sendWithTemplate = jest.fn().mockResolvedValue({
        success: false,
        provider: 'brevo',
        sentAt: new Date(),
        error: {
          code: 'NETWORK_ERROR',
          message: 'Connection failed',
          retryable: true,
        },
      } as EmailResult);

      const mockJob = {
        id: 'job-123',
        data: {
          options: {
            to: 'test@example.com',
            subject: 'Test Subject',
          },
          template: 'email-verification' as const,
          templateVariables: {
            userName: 'John Doe',
            verificationUrl: 'https://example.com/verify',
            expiresIn: '24 hours',
            supportEmail: 'support@haystack.com',
          },
        } as EmailJobData,
        attemptsMade: 0,
      } as Job<EmailJobData>;

      await expect(processor.process(mockJob)).rejects.toThrow(
        'Connection failed',
      );
    });

    it('should not throw for non-retryable failures', async () => {
      emailService.sendWithTemplate = jest.fn().mockResolvedValue({
        success: false,
        provider: 'brevo',
        sentAt: new Date(),
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email address',
          retryable: false,
        },
      } as EmailResult);

      const mockJob = {
        id: 'job-123',
        data: {
          options: {
            to: 'invalid-email',
            subject: 'Test Subject',
          },
          template: 'email-verification' as const,
          templateVariables: {
            userName: 'John Doe',
            verificationUrl: 'https://example.com/verify',
            expiresIn: '24 hours',
            supportEmail: 'support@haystack.com',
          },
        } as EmailJobData,
        attemptsMade: 0,
      } as Job<EmailJobData>;

      const result = await processor.process(mockJob);

      expect(result.success).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle processing errors', async () => {
      emailService.sendWithTemplate = jest
        .fn()
        .mockRejectedValue(new Error('Unexpected error'));

      const mockJob = {
        id: 'job-123',
        data: {
          options: {
            to: 'test@example.com',
            subject: 'Test Subject',
          },
          template: 'email-verification' as const,
          templateVariables: {
            userName: 'John Doe',
            verificationUrl: 'https://example.com/verify',
            expiresIn: '24 hours',
            supportEmail: 'support@haystack.com',
          },
        } as EmailJobData,
        attemptsMade: 0,
      } as Job<EmailJobData>;

      await expect(processor.process(mockJob)).rejects.toThrow(
        'Unexpected error',
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
