import { BaseError } from './base.error';

export enum SystemErrorCode {
  INTERNAL_ERROR = 'internal_server_error',
  DATABASE_ERROR = 'database_error',
  SERVICE_UNAVAILABLE = 'service_unavailable',
}

const ERROR_MESSAGES: Record<SystemErrorCode, string> = {
  [SystemErrorCode.INTERNAL_ERROR]:
    'An unexpected error occurred. Please try again or contact support.',
  [SystemErrorCode.DATABASE_ERROR]:
    'A database error occurred. Please try again or contact support.',
  [SystemErrorCode.SERVICE_UNAVAILABLE]:
    'The service is temporarily unavailable. Please try again later.',
};

export class SystemError extends BaseError {
  readonly code: SystemErrorCode;
  readonly statusCode = 500;
  readonly type = 'system_error' as const;

  constructor(
    code: SystemErrorCode,
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
   * Factory methods
   */
  static internalError(cause?: Error, details?: Record<string, any>) {
    return new SystemError(
      SystemErrorCode.INTERNAL_ERROR,
      {
        suggestion: 'Please try again or contact support if the issue persists',
        ...details,
      },
      cause,
    );
  }

  static databaseError(cause?: Error, details?: Record<string, any>) {
    return new SystemError(
      SystemErrorCode.DATABASE_ERROR,
      {
        suggestion: 'Please try again or contact support',
        ...details,
      },
      cause,
    );
  }

  static serviceUnavailable(retryAfter?: number) {
    return new SystemError(SystemErrorCode.SERVICE_UNAVAILABLE, {
      retryAfter,
      suggestion: retryAfter
        ? `Please try again after ${retryAfter} seconds`
        : 'Please try again later',
    });
  }
}
