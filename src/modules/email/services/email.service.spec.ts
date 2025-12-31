import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from './email.service';
import { TemplateService } from './template.service';
import { BrevoAdapter } from '../adapters/brevo.adapter';
import { EmailLogEntity } from '../entities/email-log.entity';
import { LoggerService } from '@logging/services/logger.service';
import { EmailConfig } from '@config/email.config';
import { EmailResult } from '../interfaces';

describe('EmailService', () => {
  let service: EmailService;
  let templateService: jest.Mocked<TemplateService>;
  let brevoAdapter: jest.Mocked<BrevoAdapter>;
  let emailLogRepository: jest.Mocked<Repository<EmailLogEntity>>;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<LoggerService>;

  const mockEmailConfig: EmailConfig = {
    defaultProvider: 'brevo',
    from: {
      name: 'Haystack',
      email: 'noreply@haystack.com',
    },
    replyTo: 'support@haystack.com',
    templates: {
      directory: 'src/modules/email/templates',
      defaultLocale: 'en',
    },
    providers: {
      brevo: {
        apiKey: 'test-api-key',
        apiUrl: 'https://api.brevo.com/v3',
      },
    },
    retry: {
      maxAttempts: 3,
      backoffDelay: 2000,
    },
    tracking: {
      enabled: true,
      trackOpens: false,
      trackClicks: false,
    },
  };

  beforeEach(async () => {
    const mockTemplateRegistry = {
      validateVariablesWithDetails: jest.fn().mockReturnValue({
        valid: true,
        error: null,
      }),
    };

    templateService = {
      getRegistry: jest.fn().mockReturnValue(mockTemplateRegistry),
      render: jest.fn().mockResolvedValue({
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      }),
    } as any;

    brevoAdapter = {
      send: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
        provider: 'brevo',
        sentAt: new Date(),
      } as EmailResult),
      getName: jest.fn().mockReturnValue('brevo'),
      healthCheck: jest.fn(),
      getRateLimits: jest.fn(),
    } as any;

    emailLogRepository = {
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({}),
    } as any;

    configService = {
      get: jest.fn().mockReturnValue(mockEmailConfig),
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
        EmailService,
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: TemplateService,
          useValue: templateService,
        },
        {
          provide: BrevoAdapter,
          useValue: brevoAdapter,
        },
        {
          provide: getRepositoryToken(EmailLogEntity),
          useValue: emailLogRepository,
        },
        {
          provide: LoggerService,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendWithTemplate', () => {
    it('should send email with template successfully', async () => {
      const options = {
        to: 'test@example.com',
        template: 'email-verification' as const,
        templateVariables: {
          userName: 'John Doe',
          verificationUrl: 'https://example.com/verify',
          expiresIn: '24 hours',
          supportEmail: 'support@haystack.com',
        },
      };

      const result = await service.sendWithTemplate(options);

      expect(result.success).toBe(true);
      expect(templateService.render).toHaveBeenCalledWith(
        'email-verification',
        options.templateVariables,
      );
      expect(brevoAdapter.send).toHaveBeenCalled();
      expect(emailLogRepository.save).toHaveBeenCalled();
    });

    it('should validate template variables before sending', async () => {
      const mockRegistry = {
        validateVariablesWithDetails: jest.fn().mockReturnValue({
          valid: false,
          error: {
            details: [{ message: 'userName is required' }],
          },
        }),
      };

      templateService.getRegistry = jest.fn().mockReturnValue(mockRegistry);

      const options = {
        to: 'test@example.com',
        template: 'email-verification' as const,
        templateVariables: {
          // Missing required fields
          userName: '',
        } as any,
      };

      const result = await service.sendWithTemplate(options);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(templateService.render).not.toHaveBeenCalled();
      expect(brevoAdapter.send).not.toHaveBeenCalled();
    });

    it('should handle template rendering errors', async () => {
      templateService.render = jest
        .fn()
        .mockRejectedValue(new Error('Template not found'));

      const options = {
        to: 'test@example.com',
        template: 'email-verification' as const,
        templateVariables: {
          userName: 'John Doe',
          verificationUrl: 'https://example.com/verify',
          expiresIn: '24 hours',
          supportEmail: 'support@haystack.com',
        },
      };

      const result = await service.sendWithTemplate(options);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TEMPLATE_ERROR');
      expect(brevoAdapter.send).not.toHaveBeenCalled();
    });

    it('should respect logEmail flag when disabled', async () => {
      const options = {
        to: 'test@example.com',
        template: 'email-verification' as const,
        templateVariables: {
          userName: 'John Doe',
          verificationUrl: 'https://example.com/verify',
          expiresIn: '24 hours',
          supportEmail: 'support@haystack.com',
        },
        logEmail: false,
      };

      await service.sendWithTemplate(options);

      expect(emailLogRepository.save).not.toHaveBeenCalled();
    });

    it('should respect global tracking disabled', async () => {
      configService.get = jest.fn().mockReturnValue({
        ...mockEmailConfig,
        tracking: {
          enabled: false,
          trackOpens: false,
          trackClicks: false,
        },
      });

      const options = {
        to: 'test@example.com',
        template: 'email-verification' as const,
        templateVariables: {
          userName: 'John Doe',
          verificationUrl: 'https://example.com/verify',
          expiresIn: '24 hours',
          supportEmail: 'support@haystack.com',
        },
      };

      await service.sendWithTemplate(options);

      expect(emailLogRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('sendDirect', () => {
    it('should send email directly without template', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      };

      const result = await service.sendDirect(options);

      expect(result.success).toBe(true);
      expect(brevoAdapter.send).toHaveBeenCalledWith(options);
      expect(templateService.render).not.toHaveBeenCalled();
      expect(emailLogRepository.save).toHaveBeenCalled();
    });

    it('should handle provider errors', async () => {
      brevoAdapter.send = jest.fn().mockResolvedValue({
        success: false,
        provider: 'brevo',
        sentAt: new Date(),
        error: {
          code: 'NETWORK_ERROR',
          message: 'Connection failed',
          retryable: true,
        },
      } as EmailResult);

      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      const result = await service.sendDirect(options);

      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(true);
      expect(emailLogRepository.save).toHaveBeenCalled();
    });

    it('should throw error if provider not found', async () => {
      configService.get = jest.fn().mockReturnValue({
        ...mockEmailConfig,
        defaultProvider: 'unknown',
      });

      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      await expect(service.sendDirect(options)).rejects.toThrow(
        'Email provider "unknown" not found',
      );
    });
  });

  describe('getProviderHealth', () => {
    it('should return provider health', async () => {
      const mockHealth = {
        status: 'up' as const,
        lastChecked: new Date(),
        latency: 100,
      };

      brevoAdapter.healthCheck = jest.fn().mockResolvedValue(mockHealth);

      const health = await service.getProviderHealth('brevo');

      expect(health).toEqual(mockHealth);
      expect(brevoAdapter.healthCheck).toHaveBeenCalled();
    });

    it('should use default provider if not specified', async () => {
      const mockHealth = {
        status: 'up' as const,
        lastChecked: new Date(),
      };

      brevoAdapter.healthCheck = jest.fn().mockResolvedValue(mockHealth);

      await service.getProviderHealth();

      expect(brevoAdapter.healthCheck).toHaveBeenCalled();
    });
  });
});
