import { BaseError } from './base.error';

export enum NetworkErrorCode {
  TIMEOUT = 'network_timeout',
  CONNECTION_ERROR = 'network_connection_error',
  DNS_ERROR = 'network_dns_error',
}

const ERROR_MESSAGES: Record<NetworkErrorCode, string> = {
  [NetworkErrorCode.TIMEOUT]:
    'The request timed out. Please check your connection and try again.',
  [NetworkErrorCode.CONNECTION_ERROR]:
    'Unable to establish connection. Please check your network and try again.',
  [NetworkErrorCode.DNS_ERROR]:
    'DNS resolution failed. Please check your network configuration.',
};

export class NetworkError extends BaseError {
  readonly code: NetworkErrorCode;
  readonly statusCode = 504; // Gateway Timeout
  readonly type = 'system_error' as const;

  constructor(
    code: NetworkErrorCode,
    details?: Record<string, any>,
    cause?: Error,
    customMessage?: string,
  ) {
    const message = customMessage || ERROR_MESSAGES[code];

    super(message, {
      details: {
        errorCode: code,
        ...details,
      },
      cause,
      userMessage: message,
      docUrl: `https://docs.yourapp.com/errors/${code}`,
    });

    this.code = code;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return true; // Network errors are generally retryable
  }

  /**
   * Factory methods
   */
  static timeout(timeoutMs?: number) {
    return new NetworkError(NetworkErrorCode.TIMEOUT, {
      timeoutMs,
      suggestion: 'Please try again after checking your connection',
    });
  }

  static connectionError(cause?: Error) {
    return new NetworkError(
      NetworkErrorCode.CONNECTION_ERROR,
      {
        suggestion: 'Please check your network connection and try again',
      },
      cause,
    );
  }
}
