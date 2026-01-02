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
      const errorDetails = this.extractErrorDetails(error);
      const errorObj = toError(error);

      // Get email config for logging (may fail if config is missing)
      const emailConfig = this.configService.get<EmailConfig>('email');

      // Log comprehensive error details
      this.logger.error('Failed to send email via Brevo', errorObj, {
        // Request context
        to: this.formatEmailForLog(options.to),
        subject: options.subject,
        from: options.from?.email || emailConfig?.from?.email,
        cc: this.formatEmailForLog(options.cc),
        bcc: this.formatEmailForLog(options.bcc),
        // Error details
        errorCode: errorDetails.code,
        httpStatusCode: errorDetails.statusCode,
        brevoError: errorDetails.brevoError,
        retryable: errorDetails.retryable,
        // Additional context
        errorMessage: errorDetails.message,
        errorName: errorObj.name,
        hasStack: !!errorObj.stack,
      });

      return {
        success: false,
        provider: 'brevo',
        sentAt: new Date(),
        error: {
          code: errorDetails.code,
          message: errorDetails.message,
          retryable: errorDetails.retryable,
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
      const errorDetails = this.extractErrorDetails(error);

      this.logger.error('Brevo health check failed', errorObj, {
        errorCode: errorDetails.code,
        httpStatusCode: errorDetails.statusCode,
        brevoError: errorDetails.brevoError,
        errorMessage: errorDetails.message,
      });

      return {
        status: 'down',
        lastChecked: new Date(),
        error: errorDetails.message,
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
   * Extract detailed error information from Brevo API errors
   */
  private extractErrorDetails(error: unknown): {
    code: string;
    message: string;
    statusCode?: number;
    brevoError?: any;
    retryable: boolean;
  } {
    const errorObj = toError(error);
    const message = errorObj.message.toLowerCase();

    // Try to extract HTTP status code from error
    let statusCode: number | undefined;
    let brevoError: any;

    // Brevo SDK errors typically have a response property
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as any).response;
      if (response?.status) {
        statusCode = response.status;
      }
      if (response?.body) {
        brevoError = response.body;
      }
      if (response?.data) {
        brevoError = response.data;
      }
    }

    // Also check for statusCode directly on error
    if (
      !statusCode &&
      error &&
      typeof error === 'object' &&
      'statusCode' in error
    ) {
      statusCode = (error as any).statusCode;
    }

    // Extract error code based on status code (most reliable)
    let code: string;
    let retryable: boolean;

    if (statusCode) {
      switch (statusCode) {
        case 400:
          code = 'BAD_REQUEST';
          retryable = false;
          break;
        case 401:
          code = 'AUTH_ERROR';
          retryable = false;
          break;
        case 403:
          code = 'FORBIDDEN';
          retryable = false;
          break;
        case 404:
          code = 'NOT_FOUND';
          retryable = false;
          break;
        case 429:
          code = 'RATE_LIMIT';
          retryable = true;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          code = 'SERVER_ERROR';
          retryable = true;
          break;
        default:
          // 4xx errors are generally not retryable, 5xx are
          if (statusCode >= 400 && statusCode < 500) {
            code = 'CLIENT_ERROR';
            retryable = false;
          } else if (statusCode >= 500) {
            code = 'SERVER_ERROR';
            retryable = true;
          } else {
            code = 'UNKNOWN_ERROR';
            retryable = true; // Default to retryable for unknown
          }
      }
    } else {
      // Fallback to message-based detection if no status code
      if (message.includes('400') || message.includes('bad request')) {
        code = 'BAD_REQUEST';
        retryable = false;
      } else if (message.includes('401') || message.includes('unauthorized')) {
        code = 'AUTH_ERROR';
        retryable = false;
      } else if (message.includes('403') || message.includes('forbidden')) {
        code = 'FORBIDDEN';
        retryable = false;
      } else if (message.includes('404') || message.includes('not found')) {
        code = 'NOT_FOUND';
        retryable = false;
      } else if (message.includes('429') || message.includes('rate limit')) {
        code = 'RATE_LIMIT';
        retryable = true;
      } else if (
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504')
      ) {
        code = 'SERVER_ERROR';
        retryable = true;
      } else if (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('econnrefused') ||
        message.includes('enotfound') ||
        message.includes('etimedout') ||
        message.includes('econnreset')
      ) {
        code = 'NETWORK_ERROR';
        retryable = true;
      } else {
        code = 'UNKNOWN_ERROR';
        retryable = true; // Default to retryable for unknown errors
      }
    }

    // Build comprehensive error message
    let errorMessage = getErrorMessage(errorObj);

    // Enhance message with Brevo API error details if available
    if (brevoError) {
      if (typeof brevoError === 'string') {
        errorMessage = `${errorMessage}: ${brevoError}`;
      } else if (brevoError.message) {
        errorMessage = `${errorMessage}: ${brevoError.message}`;
      } else if (brevoError.error) {
        errorMessage = `${errorMessage}: ${brevoError.error}`;
      } else if (Array.isArray(brevoError) && brevoError.length > 0) {
        // Brevo sometimes returns array of errors
        const firstError = brevoError[0];
        if (typeof firstError === 'string') {
          errorMessage = `${errorMessage}: ${firstError}`;
        } else if (firstError.message) {
          errorMessage = `${errorMessage}: ${firstError.message}`;
        }
      }
    }

    // Add status code to message if available
    if (statusCode) {
      errorMessage = `[${statusCode}] ${errorMessage}`;
    }

    return {
      code,
      message: errorMessage,
      statusCode,
      brevoError,
      retryable,
    };
  }

  /**
   * Format email address(es) for logging
   */
  private formatEmailForLog(
    address: string | string[] | EmailAddress | EmailAddress[] | undefined,
  ): string | undefined {
    if (!address) {
      return undefined;
    }

    if (typeof address === 'string') {
      return address;
    }

    if (Array.isArray(address)) {
      return address
        .map((addr) => (typeof addr === 'string' ? addr : addr.email))
        .join(', ');
    }

    return address.email;
  }
}
