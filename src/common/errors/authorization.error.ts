import { BaseError } from './base.error';

export enum AuthorizationErrorCode {
  ERROR = 'authorization_error',
  INSUFFICIENT_PERMISSIONS = 'insufficient_permissions',
  FORBIDDEN = 'forbidden',
  RESOURCE_ACCESS_DENIED = 'resource_access_denied',
}

const ERROR_MESSAGES: Record<AuthorizationErrorCode, string> = {
  [AuthorizationErrorCode.ERROR]:
    'You do not have permission to perform this action.',
  [AuthorizationErrorCode.INSUFFICIENT_PERMISSIONS]:
    'Your API key does not have the required permissions for this operation.',
  [AuthorizationErrorCode.FORBIDDEN]: 'Access to this resource is forbidden.',
  [AuthorizationErrorCode.RESOURCE_ACCESS_DENIED]:
    'You do not have access to this resource.',
};

export class AuthorizationError extends BaseError {
  readonly code: AuthorizationErrorCode;
  readonly statusCode = 403;
  readonly type = 'authorization_error' as const;

  constructor(
    code: AuthorizationErrorCode,
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
  static insufficientPermissions(requiredPermission?: string) {
    return new AuthorizationError(
      AuthorizationErrorCode.INSUFFICIENT_PERMISSIONS,
      {
        requiredPermission,
        suggestion: 'Check your API key permissions or contact support',
      },
    );
  }

  static forbidden(resource?: string) {
    return new AuthorizationError(AuthorizationErrorCode.FORBIDDEN, {
      resource,
      suggestion: 'You do not have access to this resource',
    });
  }
}
