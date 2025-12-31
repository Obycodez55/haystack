import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailConfig } from '@config/email.config';
import {
  IEmailProvider,
  EmailSendOptions,
  EmailResult,
  EmailAddress,
} from '../interfaces';
import { TemplateService } from './template.service';
import { BrevoAdapter } from '../adapters/brevo.adapter';
import { EmailLogEntity } from '../entities/email-log.entity';
import { LoggerService } from '@logging/services/logger.service';
import {
  TemplateName,
  TemplateVariablesMap,
} from '../interfaces/template-variables.interface';
import { toError, getErrorMessage } from '@common/utils/error.util';

/**
 * Email service options with strict typing
 * When template is provided, templateVariables must match the template type
 */
export interface SendEmailOptions<
  T extends TemplateName = TemplateName,
> extends Omit<EmailSendOptions, 'html' | 'text' | 'subject'> {
  template: T;
  templateVariables: TemplateVariablesMap[T];
  tenantId?: string;
  userId?: string;
  logEmail?: boolean; // Whether to log email (default: true)
}

/**
 * Email service options without template (direct HTML/text)
 */
export interface SendEmailDirectOptions extends EmailSendOptions {
  template?: never;
  templateVariables?: never;
  tenantId?: string;
  userId?: string;
  logEmail?: boolean;
}

/**
 * Union type for all email sending options
 */
export type EmailSendOptionsUnion<T extends TemplateName = TemplateName> =
  | SendEmailOptions<T>
  | SendEmailDirectOptions;

/**
 * Email service
 * Main service for sending emails
 * Handles template rendering, provider selection, retry logic, and logging
 */
@Injectable()
export class EmailService {
  private providers: Map<string, IEmailProvider> = new Map();

  constructor(
    private configService: ConfigService,
    private templateService: TemplateService,
    private brevoAdapter: BrevoAdapter,
    @InjectRepository(EmailLogEntity)
    private emailLogRepository: Repository<EmailLogEntity>,
    private logger: LoggerService,
  ) {
    this.logger.setContext('EmailService');

    // Register providers
    this.providers.set('brevo', this.brevoAdapter);
  }

  /**
   * Send email with template (type-safe)
   * Template and templateVariables are enforced to match at compile time
   */
  async sendWithTemplate<T extends TemplateName>(
    options: SendEmailOptions<T>,
  ): Promise<EmailResult> {
    const emailConfig = this.configService.get<EmailConfig>('email');
    if (!emailConfig) {
      throw new Error('Email configuration is missing');
    }

    // Validate template variables at runtime
    const validation = this.templateService
      .getRegistry()
      .validateVariablesWithDetails(
        options.template,
        options.templateVariables,
      );

    if (!validation.valid) {
      const errorMessage = validation.error
        ? validation.error.details.map((d) => d.message).join('; ')
        : 'Invalid template variables';

      this.logger.error(
        'Template variable validation failed',
        new Error(errorMessage),
        {
          template: options.template,
          errors: validation.error?.details,
        },
      );

      return {
        success: false,
        provider: emailConfig.defaultProvider,
        sentAt: new Date(),
        error: {
          code: 'VALIDATION_ERROR',
          message: errorMessage,
          retryable: false,
        },
      };
    }

    // Render template
    let finalOptions: EmailSendOptions; // This will be converted to EmailSendOptions (without template fields)
    try {
      const rendered = await this.templateService.render(
        options.template,
        options.templateVariables,
      );

      finalOptions = {
        to: options.to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        cc: options.cc,
        bcc: options.bcc,
        from: options.from,
        replyTo: options.replyTo,
        attachments: options.attachments,
        metadata: options.metadata,
        priority: options.priority,
        scheduledAt: options.scheduledAt,
        tags: options.tags,
      } as EmailSendOptions;
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Failed to render email template', errorObj, {
        template: options.template,
      });

      return {
        success: false,
        provider: emailConfig.defaultProvider,
        sentAt: new Date(),
        error: {
          code: 'TEMPLATE_ERROR',
          message: getErrorMessage(errorObj),
          retryable: false,
        },
      };
    }

    // Get provider and send
    const providerName = emailConfig.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Email provider "${providerName}" not found`);
    }

    const result = await provider.send(finalOptions);

    // Log email if enabled (respect both global tracking and per-email flag)
    const shouldLog =
      emailConfig.tracking.enabled && options.logEmail !== false;
    if (shouldLog) {
      await this.logEmail(result, finalOptions, options, providerName);
    }

    return result;
  }

  /**
   * Send email directly (without template)
   * Use when you have pre-rendered HTML/text
   */
  async sendDirect(options: SendEmailDirectOptions): Promise<EmailResult> {
    const emailConfig = this.configService.get<EmailConfig>('email');
    if (!emailConfig) {
      throw new Error('Email configuration is missing');
    }

    // Get provider
    const providerName = emailConfig.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Email provider "${providerName}" not found`);
    }

    // Send email
    const result = await provider.send(options);

    // Log email if enabled (respect both global tracking and per-email flag)
    const shouldLog =
      emailConfig.tracking.enabled && options.logEmail !== false;
    if (shouldLog) {
      await this.logEmail(result, options, options, providerName);
    }

    return result;
  }

  /**
   * Send email (backward compatible, but prefer sendWithTemplate or sendDirect)
   * @deprecated Use sendWithTemplate() or sendDirect() for better type safety
   */
  async send(
    options: SendEmailOptions | SendEmailDirectOptions,
  ): Promise<EmailResult> {
    if (options.template) {
      return this.sendWithTemplate(options);
    }
    return this.sendDirect(options);
  }

  /**
   * Send email synchronously with template (bypasses queue)
   * Use sparingly - prefer queue for better performance
   */
  async sendWithTemplateSync<T extends TemplateName>(
    options: SendEmailOptions<T>,
  ): Promise<EmailResult> {
    return this.sendWithTemplate(options);
  }

  /**
   * Send email synchronously without template (bypasses queue)
   * Use sparingly - prefer queue for better performance
   */
  async sendDirectSync(options: SendEmailDirectOptions): Promise<EmailResult> {
    return this.sendDirect(options);
  }

  /**
   * Get provider health
   */
  async getProviderHealth(providerName?: string): Promise<any> {
    const emailConfig = this.configService.get<EmailConfig>('email');
    if (!emailConfig) {
      throw new Error('Email configuration is missing');
    }

    const provider = this.providers.get(
      providerName || emailConfig.defaultProvider,
    );

    if (!provider) {
      throw new Error(`Email provider "${providerName}" not found`);
    }

    return provider.healthCheck();
  }

  /**
   * Get all providers health
   */
  async getAllProvidersHealth(): Promise<Record<string, any>> {
    const health: Record<string, any> = {};

    for (const [name, provider] of this.providers.entries()) {
      try {
        health[name] = await provider.healthCheck();
      } catch (error) {
        health[name] = {
          status: 'down',
          error: getErrorMessage(error),
        };
      }
    }

    return health;
  }

  /**
   * Log email to database
   */
  private async logEmail(
    result: EmailResult,
    options: EmailSendOptions,
    originalOptions: SendEmailOptions | SendEmailDirectOptions,
    provider: string,
  ): Promise<void> {
    try {
      const log = this.emailLogRepository.create({
        messageId: result.messageId || `temp-${Date.now()}`,
        provider,
        to: Array.isArray(options.to)
          ? options.to.join(', ')
          : typeof options.to === 'string'
            ? options.to
            : (options.to as EmailAddress).email,
        cc: options.cc
          ? Array.isArray(options.cc)
            ? options.cc.join(', ')
            : typeof options.cc === 'string'
              ? options.cc
              : (options.cc as EmailAddress).email
          : undefined,
        bcc: options.bcc
          ? Array.isArray(options.bcc)
            ? options.bcc.join(', ')
            : typeof options.bcc === 'string'
              ? options.bcc
              : (options.bcc as EmailAddress).email
          : undefined,
        subject: options.subject,
        template: originalOptions.template,
        status: result.success ? 'sent' : 'failed',
        error: result.error?.message,
        errorCode: result.error?.code,
        retryable: result.error?.retryable || false,
        attemptCount: 1,
        metadata: {
          ...originalOptions.metadata,
          providerResult: result.metadata,
        },
        tags: originalOptions.tags?.join(','),
        sentAt: result.success ? result.sentAt : undefined,
        tenantId: originalOptions.tenantId,
      });

      await this.emailLogRepository.save(log);
    } catch (error) {
      // Don't fail email send if logging fails
      this.logger.error('Failed to log email', toError(error), {
        messageId: result.messageId,
      });
    }
  }
}
