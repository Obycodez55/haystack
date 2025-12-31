import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BrevoAdapter } from './brevo.adapter';
import { LoggerService } from '@logging/services/logger.service';
import { EmailConfig } from '@config/email.config';
import * as brevo from '@getbrevo/brevo';

// Mock Brevo SDK
jest.mock('@getbrevo/brevo', () => ({
  TransactionalEmailsApi: jest.fn().mockImplementation(() => ({
    setApiKey: jest.fn(),
    sendTransacEmail: jest.fn(),
  })),
  AccountApi: jest.fn().mockImplementation(() => ({
    setApiKey: jest.fn(),
    getAccount: jest.fn(),
  })),
  TransactionalEmailsApiApiKeys: {
    apiKey: 'api-key',
  },
  AccountApiApiKeys: {
    apiKey: 'api-key',
  },
  SendSmtpEmail: jest.fn(),
}));

describe('BrevoAdapter', () => {
  let adapter: BrevoAdapter;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<LoggerService>;
  let mockBrevoClient: any;

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
    mockBrevoClient = {
      setApiKey: jest.fn(),
      sendTransacEmail: jest.fn().mockResolvedValue({
        body: {
          messageId: 'test-message-id',
          messageIds: ['test-message-id'],
        },
      }),
    };

    (brevo.TransactionalEmailsApi as jest.Mock).mockImplementation(
      () => mockBrevoClient,
    );

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
        BrevoAdapter,
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: LoggerService,
          useValue: logger,
        },
      ],
    }).compile();

    adapter = module.get<BrevoAdapter>(BrevoAdapter);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('send', () => {
    it('should send email successfully', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      };

      const result = await adapter.send(options);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(result.provider).toBe('brevo');
      expect(mockBrevoClient.sendTransacEmail).toHaveBeenCalled();
    });

    it('should handle multiple recipients', async () => {
      const options = {
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      await adapter.send(options);

      const callArgs = mockBrevoClient.sendTransacEmail.mock.calls[0][0];
      expect(callArgs.to).toHaveLength(2);
    });

    it('should handle EmailAddress objects', async () => {
      const options = {
        to: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      await adapter.send(options);

      const callArgs = mockBrevoClient.sendTransacEmail.mock.calls[0][0];
      expect(callArgs.to[0].name).toBe('John Doe');
      expect(callArgs.to[0].email).toBe('john@example.com');
    });

    it('should handle CC and BCC', async () => {
      const options = {
        to: 'test@example.com',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      await adapter.send(options);

      const callArgs = mockBrevoClient.sendTransacEmail.mock.calls[0][0];
      expect(callArgs.cc).toBeDefined();
      expect(callArgs.bcc).toBeDefined();
    });

    it('should handle attachments', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        attachments: [
          {
            filename: 'test.pdf',
            content: Buffer.from('test content'),
          },
        ],
      };

      await adapter.send(options);

      const callArgs = mockBrevoClient.sendTransacEmail.mock.calls[0][0];
      expect(callArgs.attachment).toHaveLength(1);
      expect(callArgs.attachment[0].name).toBe('test.pdf');
    });

    it('should handle scheduled emails', async () => {
      const scheduledAt = new Date('2024-12-31T12:00:00Z');
      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        scheduledAt,
      };

      await adapter.send(options);

      const callArgs = mockBrevoClient.sendTransacEmail.mock.calls[0][0];
      expect(callArgs.scheduledAt).toBe(scheduledAt);
    });

    it('should handle tags', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        tags: ['verification', 'user'],
      };

      await adapter.send(options);

      const callArgs = mockBrevoClient.sendTransacEmail.mock.calls[0][0];
      expect(callArgs.tags).toEqual(['verification', 'user']);
    });

    it('should handle network errors as retryable', async () => {
      mockBrevoClient.sendTransacEmail = jest
        .fn()
        .mockRejectedValue(new Error('ECONNREFUSED'));

      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      const result = await adapter.send(options);

      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(true);
      expect(result.error?.code).toBe('NETWORK_ERROR');
    });

    it('should handle rate limit errors as retryable', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.message = '429 Too Many Requests';
      mockBrevoClient.sendTransacEmail = jest
        .fn()
        .mockRejectedValue(rateLimitError);

      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      const result = await adapter.send(options);

      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(true);
      expect(result.error?.code).toBe('RATE_LIMIT');
    });

    it('should handle validation errors as non-retryable', async () => {
      const validationError = new Error(
        '400 Bad Request: Invalid email address',
      );
      mockBrevoClient.sendTransacEmail = jest
        .fn()
        .mockRejectedValue(validationError);

      const options = {
        to: 'invalid-email',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      const result = await adapter.send(options);

      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(false);
      expect(result.error?.code).toBe('BAD_REQUEST');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const mockAccountApi = {
        setApiKey: jest.fn(),
        getAccount: jest.fn().mockResolvedValue({}),
      };

      (brevo.AccountApi as jest.Mock).mockImplementation(() => mockAccountApi);

      const health = await adapter.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.latency).toBeDefined();
    });

    it('should return unhealthy status on error', async () => {
      const mockAccountApi = {
        setApiKey: jest.fn(),
        getAccount: jest.fn().mockRejectedValue(new Error('API Error')),
      };

      (brevo.AccountApi as jest.Mock).mockImplementation(() => mockAccountApi);

      const health = await adapter.healthCheck();

      expect(health.status).toBe('down');
      expect(health.error).toBeDefined();
    });
  });

  describe('getName', () => {
    it('should return provider name', () => {
      expect(adapter.getName()).toBe('brevo');
    });
  });

  describe('getRateLimits', () => {
    it('should return rate limit information', () => {
      const rateLimits = adapter.getRateLimits();

      expect(rateLimits.limit).toBeDefined();
      expect(rateLimits.resetAt).toBeInstanceOf(Date);
    });
  });
});
