/**
 * Email provider interface
 * All email providers must implement this interface
 */
export interface IEmailProvider {
  /**
   * Send a single email
   */
  send(options: EmailSendOptions): Promise<EmailResult>;

  /**
   * Send multiple emails in batch
   */
  sendBatch?(options: EmailSendOptions[]): Promise<EmailResult[]>;

  /**
   * Health check for the provider
   */
  healthCheck(): Promise<ProviderHealth>;

  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Get rate limits information
   */
  getRateLimits(): RateLimitInfo;
}

/**
 * Email send options
 */
export interface EmailSendOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  template?: string; // Template name
  templateVariables?: Record<string, any>; // Type-safe template variables
  html?: string; // Direct HTML (if no template)
  text?: string; // Plain text fallback
  from?: EmailAddress; // Override default
  replyTo?: EmailAddress;
  attachments?: Attachment[];
  metadata?: Record<string, any>; // For tracking
  priority?: 'high' | 'normal' | 'low';
  scheduledAt?: Date; // Future send
  tags?: string[]; // For analytics
}

/**
 * Email address
 */
export interface EmailAddress {
  name?: string;
  email: string;
}

/**
 * Email attachment
 */
export interface Attachment {
  filename: string;
  content: string | Buffer; // Base64 encoded or Buffer
  contentType?: string;
}

/**
 * Email send result
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  provider: string;
  sentAt: Date;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  metadata?: Record<string, any>;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'down';
  lastChecked: Date;
  latency?: number;
  error?: string;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}
