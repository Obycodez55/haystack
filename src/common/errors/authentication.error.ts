import { BaseError } from './base.error';

export enum AuthenticationErrorCode {
  ERROR = 'authentication_error',
  INVALID_API_KEY = 'invalid_api_key',
  API_KEY_EXPIRED = 'api_key_expired',
  API_KEY_REVOKED = 'api_key_revoked',
  MISSING_API_KEY = 'missing_api_key',
}

const ERROR_MESSAGES: Record<AuthenticationErrorCode, string> = {
  [AuthenticationErrorCode.ERROR]:
    'Authentication failed. Please check your API key and try again.',
  [AuthenticationErrorCode.INVALID_API_KEY]:
    'The API key provided is invalid. Please check your API key and try again.',
  [AuthenticationErrorCode.API_KEY_EXPIRED]:
    'Your API key has expired. Please generate a new API key.',
  [AuthenticationErrorCode.API_KEY_REVOKED]:
    'Your API key has been revoked. Please generate a new API key.',
  [AuthenticationErrorCode.MISSING_API_KEY]:
    'API key is required. Please include your API key in the Authorization header.',
};

export class AuthenticationError extends BaseError {
  readonly code: AuthenticationErrorCode;
  readonly statusCode = 401;
  readonly type = 'authentication_error' as const;

  constructor(
    code: AuthenticationErrorCode,
    details?: Record<string, any>,
    customMessage?: string,
  ) {
    const message = customMessage || ERROR_MESSAGES[code];

    super(message, {
      details: {
        errorCode: code,
        ...details,
      },
      userMessage: message,
      docUrl: `https://docs.yourapp.com/errors/${code}`,
    });

    this.code = code;
  }

  /**
   * Factory methods
   */
  static invalidApiKey() {
    return new AuthenticationError(
      AuthenticationErrorCode.INVALID_API_KEY,
      {
        suggestion: 'Check your API key in the dashboard or generate a new one',
      },
    );
  }

  static missingApiKey() {
    return new AuthenticationError(
      AuthenticationErrorCode.MISSING_API_KEY,
      {
        suggestion: 'Include your API key in the Authorization header: Bearer sk_xxx',
      },
    );
  }

  static apiKeyExpired() {
    return new AuthenticationError(
      AuthenticationErrorCode.API_KEY_EXPIRED,
      {
        suggestion: 'Generate a new API key from your dashboard',
      },
    );
  }

  static apiKeyRevoked() {
    return new AuthenticationError(
      AuthenticationErrorCode.API_KEY_REVOKED,
      {
        suggestion: 'Generate a new API key from your dashboard',
      },
    );
  }
}

