import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import { TemplateService } from './template.service';
import { TemplateRegistry } from '../templates/template.registry';
import type { EmailConfig } from '../../../config/email.config';

// Mock fs/promises
jest.mock('fs/promises');

describe('TemplateService', () => {
  let service: TemplateService;
  let configService: jest.Mocked<ConfigService>;

  const mockEmailConfig: EmailConfig = {
    defaultProvider: 'brevo',
    from: {
      name: 'Haystack',
      email: 'noreply@haystack.com',
    },
    templates: {
      directory: 'src/modules/email/templates',
      defaultLocale: 'en',
    },
    providers: {
      brevo: {
        apiKey: 'test-api-key',
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
    configService = {
      get: jest.fn().mockReturnValue(mockEmailConfig),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('render', () => {
    it('should render template successfully', async () => {
      const mockHtmlTemplate = '<p>Hello {{userName}}</p>';
      const mockSubjectTemplate = 'Verify your email';

      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(mockHtmlTemplate) // HTML template
        .mockResolvedValueOnce(mockSubjectTemplate); // Subject template

      const variables = {
        userName: 'John Doe',
        verificationUrl: 'https://example.com/verify',
        expiresIn: '24 hours',
        supportEmail: 'support@haystack.com',
      };

      const result = await service.render('email-verification', variables);

      expect(result.html).toBe('<p>Hello John Doe</p>');
      expect(result.subject).toBe('Verify your email');
      expect(result.text).toBeDefined();
      expect(fs.readFile).toHaveBeenCalled();
    });

    it('should use default subject if subject template not found', async () => {
      const mockHtmlTemplate = '<p>Hello {{userName}}</p>';

      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(mockHtmlTemplate) // HTML template
        .mockRejectedValueOnce(new Error('File not found')); // Subject template

      const variables = {
        userName: 'John Doe',
        verificationUrl: 'https://example.com/verify',
        expiresIn: '24 hours',
        supportEmail: 'support@haystack.com',
      };

      const result = await service.render('email-verification', variables);

      expect(result.html).toBe('<p>Hello John Doe</p>');
      expect(result.subject).toBe('Verify your email address'); // Default subject
    });

    it('should throw error if template file not found', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const variables = {
        userName: 'John Doe',
        verificationUrl: 'https://example.com/verify',
        expiresIn: '24 hours',
        supportEmail: 'support@haystack.com',
      };

      await expect(
        service.render('email-verification', variables),
      ).rejects.toThrow('Template file not found');
    });

    it('should throw error if template not registered', async () => {
      const registry = service.getRegistry();
      jest.spyOn(registry, 'get').mockReturnValue(undefined);

      const variables = {
        userName: 'John Doe',
        verificationUrl: 'https://example.com/verify',
        expiresIn: '24 hours',
        supportEmail: 'support@haystack.com',
      };

      await expect(
        service.render('non-existent-template' as any, variables),
      ).rejects.toThrow('Template "non-existent-template" not found');
    });

    it('should validate template variables', async () => {
      const mockHtmlTemplate = '<p>Hello {{userName}}</p>';
      const registry = service.getRegistry();

      // Mock validateVariablesWithDetails to return invalid
      jest.spyOn(registry, 'validateVariablesWithDetails').mockReturnValue({
        valid: false,
        error: {
          details: [{ message: 'userName is required' }],
        } as any,
      });
      (fs.readFile as jest.Mock).mockResolvedValue(mockHtmlTemplate);

      const variables = {
        userName: 'John Doe',
        verificationUrl: 'https://example.com/verify',
        expiresIn: '24 hours',
        supportEmail: 'support@haystack.com',
      };

      await expect(
        service.render('email-verification', variables),
      ).rejects.toThrow('userName is required');
    });
  });

  describe('Handlebars helpers', () => {
    it('should format dates correctly', async () => {
      const mockHtmlTemplate = '{{formatDate date "short"}}';
      (fs.readFile as jest.Mock).mockResolvedValue(mockHtmlTemplate);

      const variables = {
        userName: 'John Doe',
        verificationUrl: 'https://example.com/verify',
        expiresIn: '24 hours',
        supportEmail: 'support@haystack.com',
        date: new Date('2024-01-15'),
      };

      const result = await service.render('email-verification', variables);

      expect(result.html).toMatch(/1\/15\/2024|15\/1\/2024/); // Date format varies by locale
    });

    it('should format currency correctly', async () => {
      const mockHtmlTemplate = '{{formatCurrency amount "NGN"}}';
      (fs.readFile as jest.Mock).mockResolvedValue(mockHtmlTemplate);

      const variables = {
        userName: 'John Doe',
        verificationUrl: 'https://example.com/verify',
        expiresIn: '24 hours',
        supportEmail: 'support@haystack.com',
        amount: 1000,
      };

      const result = await service.render('email-verification', variables);

      expect(result.html).toContain('1,000');
    });
  });

  describe('getRegistry', () => {
    it('should return template registry', () => {
      const registry = service.getRegistry();

      expect(registry).toBeInstanceOf(TemplateRegistry);
    });
  });
});
