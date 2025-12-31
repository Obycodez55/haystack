import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as brevo from '@getbrevo/brevo';
import {
  IEmailProvider,
  EmailSendOptions,
  EmailResult,
  ProviderHealth,
  RateLimitInfo,
  EmailAddress,
} from '../interfaces/email-provider.interface';
import { EmailConfig } from '@config/email.config';
import { LoggerService } from '@logging/services/logger.service';
import { toError, getErrorMessage } from '@common/utils/error.util';

/**
 * Brevo (formerly Sendinblue) email provider adapter
 */
@Injectable()
export class BrevoAdapter implements IEmailProvider {
  private client: brevo.TransactionalEmailsApi;
  private readonly config: EmailConfig['providers']['brevo'];

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('BrevoAdapter');

    const emailConfig = this.configService.get<EmailConfig>('email');
    if (!emailConfig) {
      throw new Error('Email configuration is missing');
    }

    this.config = emailConfig.providers.brevo;

    if (!this.config.apiKey) {
      throw new Error('Brevo API key is required');
    }

    // Initialize Brevo client
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      this.config.apiKey,
    );

    this.client = apiInstance;
  }

  /**
   * Send email via Brevo
   */
  async send(options: EmailSendOptions): Promise<EmailResult> {
    try {
      const sendSmtpEmail = new brevo.SendSmtpEmail();

      // Set recipients
      sendSmtpEmail.to = this.formatRecipients(options.to);
      if (options.cc) {
        sendSmtpEmail.cc = this.formatRecipients(options.cc);
      }
      if (options.bcc) {
        sendSmtpEmail.bcc = this.formatRecipients(options.bcc);
      }

      // Set sender
      const emailConfig = this.configService.get<EmailConfig>('email');
      if (!emailConfig) {
        throw new Error('Email configuration is missing');
      }

      sendSmtpEmail.sender = {
        name: options.from?.name || emailConfig.from.name,
        email: options.from?.email || emailConfig.from.email,
      };

      if (options.replyTo) {
        sendSmtpEmail.replyTo = this.formatEmailAddress(options.replyTo);
      } else if (emailConfig.replyTo) {
        sendSmtpEmail.replyTo = {
          email: emailConfig.replyTo,
        };
      }

      // Set subject and content
      sendSmtpEmail.subject = options.subject;

      if (options.html) {
        sendSmtpEmail.htmlContent = options.html;
      }

      if (options.text) {
        sendSmtpEmail.textContent = options.text;
      }

      // Set attachments
      if (options.attachments && options.attachments.length > 0) {
        sendSmtpEmail.attachment = options.attachments.map((att) => ({
          name: att.filename,
          content: Buffer.isBuffer(att.content)
            ? att.content.toString('base64')
            : att.content,
        }));
      }

      // Set tags for analytics
      if (options.tags && options.tags.length > 0) {
        sendSmtpEmail.tags = options.tags;
      }

      // Set scheduled send
      if (options.scheduledAt) {
        sendSmtpEmail.scheduledAt = options.scheduledAt;
      }

      // Note: Brevo tracking (opens/clicks) is configured at account level
      // in Brevo dashboard, not per-email. The tracking config flags here
      // are for our internal logging and future webhook processing.
      // If tracking is disabled globally, we won't log emails to database.

      // Set headers for tracking metadata
      if (options.metadata) {
        sendSmtpEmail.headers = {
          'X-Haystack-Metadata': JSON.stringify(options.metadata),
        };
      }

      // Send email
      const response = await this.client.sendTransacEmail(sendSmtpEmail);

      const messageId =
        response.body.messageId || response.body.messageIds?.[0];

      return {
        success: true,
        messageId: messageId || `brevo-${Date.now()}`,
        provider: 'brevo',
        sentAt: new Date(),
        metadata: {
          brevoMessageId: messageId,
          messageIds: response.body.messageIds,
        },
      };
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Failed to send email via Brevo', errorObj, {
        to: options.to,
        subject: options.subject,
      });

      // Determine if error is retryable
      const retryable = this.isRetryableError(errorObj);

      return {
        success: false,
        provider: 'brevo',
        sentAt: new Date(),
        error: {
          code: this.getErrorCode(errorObj),
          message: getErrorMessage(errorObj),
          retryable,
        },
      };
    }
  }

  /**
   * Send batch emails (Brevo supports batch sending)
   */
  async sendBatch(options: EmailSendOptions[]): Promise<EmailResult[]> {
    // Brevo doesn't have a native batch API, so we send sequentially
    // In production, you might want to use Promise.all with rate limiting
    const results: EmailResult[] = [];

    for (const option of options) {
      const result = await this.send(option);
      results.push(result);

      // Small delay to avoid rate limiting
      if (options.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<ProviderHealth> {
    try {
      const start = Date.now();

      // Try to get account info as a health check
      const accountApi = new brevo.AccountApi();
      accountApi.setApiKey(brevo.AccountApiApiKeys.apiKey, this.config.apiKey);

      await accountApi.getAccount();

      const latency = Date.now() - start;

      return {
        status: 'healthy',
        lastChecked: new Date(),
        latency,
      };
    } catch (error) {
      const errorObj = toError(error);
      this.logger.error('Brevo health check failed', errorObj);

      return {
        status: 'down',
        lastChecked: new Date(),
        error: getErrorMessage(errorObj),
      };
    }
  }

  /**
   * Get provider name
   */
  getName(): string {
    return 'brevo';
  }

  /**
   * Get rate limits (Brevo free tier: 300 emails/day)
   * This should be configured based on your Brevo plan
   */
  getRateLimits(): RateLimitInfo {
    // Default to free tier limits
    // In production, fetch this from Brevo API or config
    return {
      limit: parseInt(process.env.BREVO_RATE_LIMIT || '300', 10),
      remaining: 0, // Would need to track this
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Reset in 24h
    };
  }

  /**
   * Format recipients for Brevo API
   */
  private formatRecipients(
    recipients: string | string[] | EmailAddress | EmailAddress[],
  ): brevo.SendSmtpEmailToInner[] {
    if (typeof recipients === 'string') {
      return [{ email: recipients }];
    }

    if (Array.isArray(recipients)) {
      return recipients.map((recipient) => {
        if (typeof recipient === 'string') {
          return { email: recipient };
        }
        return {
          name: recipient.name,
          email: recipient.email,
        };
      });
    }

    return [{ email: recipients.email, name: recipients.name }];
  }

  /**
   * Format email address
   */
  private formatEmailAddress(
    address: string | EmailAddress,
  ): brevo.SendSmtpEmailReplyTo {
    if (typeof address === 'string') {
      return { email: address };
    }
    return {
      email: address.email,
      name: address.name,
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Network errors are retryable
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    ) {
      return true;
    }

    // Rate limit errors are retryable
    if (message.includes('rate limit') || message.includes('429')) {
      return true;
    }

    // Server errors (5xx) are retryable
    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503')
    ) {
      return true;
    }

    // Invalid credentials or bad requests are not retryable
    if (
      message.includes('401') ||
      message.includes('403') ||
      message.includes('400') ||
      message.includes('invalid')
    ) {
      return false;
    }

    // Default to retryable for unknown errors
    return true;
  }

  /**
   * Get error code from error
   */
  private getErrorCode(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('401') || message.includes('unauthorized')) {
      return 'AUTH_ERROR';
    }
    if (message.includes('403') || message.includes('forbidden')) {
      return 'FORBIDDEN';
    }
    if (message.includes('429') || message.includes('rate limit')) {
      return 'RATE_LIMIT';
    }
    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503')
    ) {
      return 'SERVER_ERROR';
    }
    if (message.includes('network') || message.includes('timeout')) {
      return 'NETWORK_ERROR';
    }

    return 'UNKNOWN_ERROR';
  }
}
