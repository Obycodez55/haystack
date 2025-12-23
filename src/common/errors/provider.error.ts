import { BaseError } from './base.error';

export enum ProviderErrorCode {
  ERROR = 'provider_error',
  TIMEOUT = 'provider_timeout',
  RATE_LIMIT = 'provider_rate_limit',
  UNAVAILABLE = 'provider_unavailable',
  INVALID_CREDENTIALS = 'provider_invalid_credentials',
  NOT_CONFIGURED = 'provider_not_configured',
}

const ERROR_MESSAGES: Record<ProviderErrorCode, string> = {
  [ProviderErrorCode.ERROR]:
    'The payment provider returned an error. Please try again or contact support.',
  [ProviderErrorCode.TIMEOUT]:
    'The payment provider did not respond in time. Please try again.',
  [ProviderErrorCode.RATE_LIMIT]:
    'Too many requests to the payment provider. Please wait before retrying.',
  [ProviderErrorCode.UNAVAILABLE]:
    'The payment provider is currently unavailable. Please try again later.',
  [ProviderErrorCode.INVALID_CREDENTIALS]:
    'The provider API credentials are invalid. Please check your provider configuration.',
  [ProviderErrorCode.NOT_CONFIGURED]:
    'The payment provider is not configured for your account. Please configure it first.',
};

export class ProviderError extends BaseError {
  readonly code: ProviderErrorCode;
  readonly statusCode = 502; // Bad Gateway
  readonly type = 'provider_error' as const;
  readonly provider?: string;

  constructor(
    code: ProviderErrorCode,
    provider?: string,
    details?: Record<string, any>,
    cause?: Error,
    customMessage?: string,
  ) {
    const message = customMessage || ERROR_MESSAGES[code];

    super(message, {
      details: {
        provider,
        errorCode: code,
        ...details,
      },
      cause,
      userMessage: message,
      docUrl: `https://docs.yourapp.com/errors/${code}`,
    });

    this.code = code;
    this.provider = provider;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return [
      ProviderErrorCode.TIMEOUT,
      ProviderErrorCode.RATE_LIMIT,
      ProviderErrorCode.UNAVAILABLE,
    ].includes(this.code);
  }

  /**
   * Factory methods
   */
  static timeout(provider: string, timeoutMs?: number) {
    return new ProviderError(ProviderErrorCode.TIMEOUT, provider, {
      timeoutMs,
      suggestion: 'Retry the request after a short delay',
    });
  }

  static unavailable(provider: string, retryAfter?: number) {
    return new ProviderError(ProviderErrorCode.UNAVAILABLE, provider, {
      retryAfter,
      suggestion: retryAfter
        ? `Retry after ${retryAfter} seconds`
        : 'Retry after a short delay',
    });
  }

  static invalidCredentials(provider: string) {
    return new ProviderError(ProviderErrorCode.INVALID_CREDENTIALS, provider, {
      suggestion: 'Check your provider API keys in the dashboard',
    });
  }

  static notConfigured(provider: string) {
    return new ProviderError(ProviderErrorCode.NOT_CONFIGURED, provider, {
      suggestion: 'Configure the provider in your dashboard settings',
    });
  }
}
