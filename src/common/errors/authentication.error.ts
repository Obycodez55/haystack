import { BaseError } from './base.error';

export enum AuthenticationErrorCode {
  ERROR = 'authentication_error',
  INVALID_API_KEY = 'invalid_api_key',
  API_KEY_EXPIRED = 'api_key_expired',
  API_KEY_REVOKED = 'api_key_revoked',
  MISSING_API_KEY = 'missing_api_key',
  INVALID_CREDENTIALS = 'invalid_credentials',
  ACCOUNT_NOT_FOUND = 'account_not_found',
  INVALID_TOTP_CODE = 'invalid_totp_code',
  INVALID_BACKUP_CODE = 'invalid_backup_code',
}

const ERROR_MESSAGES: Record<AuthenticationErrorCode, string> = {
  [AuthenticationErrorCode.ERROR]:
    'Authentication failed. Please check your credentials and try again.',
  [AuthenticationErrorCode.INVALID_API_KEY]:
    'The API key provided is invalid. Please check your API key and try again.',
  [AuthenticationErrorCode.API_KEY_EXPIRED]:
    'Your API key has expired. Please generate a new API key.',
  [AuthenticationErrorCode.API_KEY_REVOKED]:
    'Your API key has been revoked. Please generate a new API key.',
  [AuthenticationErrorCode.MISSING_API_KEY]:
    'API key is required. Please include your API key in the Authorization header.',
  [AuthenticationErrorCode.INVALID_CREDENTIALS]:
    'Invalid email or password. Please check your credentials and try again.',
  [AuthenticationErrorCode.ACCOUNT_NOT_FOUND]:
    'Invalid email or password. Please check your credentials and try again.',
  [AuthenticationErrorCode.INVALID_TOTP_CODE]:
    'Invalid 2FA code. Please check your authenticator app and try again.',
  [AuthenticationErrorCode.INVALID_BACKUP_CODE]:
    'Invalid backup code. Please check your backup codes and try again.',
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
    return new AuthenticationError(AuthenticationErrorCode.INVALID_API_KEY, {
      suggestion: 'Check your API key in the dashboard or generate a new one',
    });
  }

  static missingApiKey() {
    return new AuthenticationError(AuthenticationErrorCode.MISSING_API_KEY, {
      suggestion:
        'Include your API key in the Authorization header: Bearer sk_xxx',
    });
  }

  static apiKeyExpired() {
    return new AuthenticationError(AuthenticationErrorCode.API_KEY_EXPIRED, {
      suggestion: 'Generate a new API key from your dashboard',
    });
  }

  static apiKeyRevoked() {
    return new AuthenticationError(AuthenticationErrorCode.API_KEY_REVOKED, {
      suggestion: 'Generate a new API key from your dashboard',
    });
  }

  static invalidCredentials() {
    return new AuthenticationError(
      AuthenticationErrorCode.INVALID_CREDENTIALS,
      {
        suggestion:
          'Check your email and password, or use the forgot password feature',
      },
    );
  }

  static accountNotFound() {
    // Use same message as invalidCredentials for security (prevent email enumeration)
    return new AuthenticationError(
      AuthenticationErrorCode.ACCOUNT_NOT_FOUND,
      {
        suggestion:
          'Check your email and password, or use the forgot password feature',
      },
      ERROR_MESSAGES[AuthenticationErrorCode.INVALID_CREDENTIALS],
    );
  }

  static invalidTotpCode() {
    return new AuthenticationError(AuthenticationErrorCode.INVALID_TOTP_CODE, {
      suggestion: 'Make sure your authenticator app time is synchronized',
    });
  }

  static invalidBackupCode() {
    return new AuthenticationError(
      AuthenticationErrorCode.INVALID_BACKUP_CODE,
      {
        suggestion: 'Check your backup codes or use your authenticator app',
      },
    );
  }
}
