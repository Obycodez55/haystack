import { BaseError } from './base.error';

export enum TenantErrorCode {
  ERROR = 'tenant_error',
  TENANT_NOT_FOUND = 'tenant_not_found',
  KYC_ALREADY_SUBMITTED = 'kyc_already_submitted',
  KYC_NOT_SUBMITTED = 'kyc_not_submitted',
  INVALID_CURRENCY = 'invalid_currency',
  INVALID_TIMEZONE = 'invalid_timezone',
  TENANT_SUSPENDED = 'tenant_suspended',
  TENANT_DELETED = 'tenant_deleted',
}

const ERROR_MESSAGES: Record<TenantErrorCode, string> = {
  [TenantErrorCode.ERROR]:
    'An error occurred while processing your tenant request.',
  [TenantErrorCode.TENANT_NOT_FOUND]:
    'Tenant not found. Please check your account and try again.',
  [TenantErrorCode.KYC_ALREADY_SUBMITTED]:
    'KYC has already been submitted. Please wait for review or contact support.',
  [TenantErrorCode.KYC_NOT_SUBMITTED]:
    'KYC has not been submitted yet. Please submit your KYC information first.',
  [TenantErrorCode.INVALID_CURRENCY]:
    'Invalid currency code. Please use a valid ISO 4217 currency code.',
  [TenantErrorCode.INVALID_TIMEZONE]:
    'Invalid timezone. Please use a valid IANA timezone identifier.',
  [TenantErrorCode.TENANT_SUSPENDED]:
    'Your account has been suspended. Please contact support for assistance.',
  [TenantErrorCode.TENANT_DELETED]:
    'Your account has been deleted. Please contact support for assistance.',
};

export class TenantError extends BaseError {
  readonly code: TenantErrorCode;
  readonly statusCode = 400;
  readonly type = 'client_error' as const;

  constructor(
    code: TenantErrorCode,
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
  static notFound(tenantId?: string) {
    return new TenantError(TenantErrorCode.TENANT_NOT_FOUND, {
      tenantId,
      suggestion: 'Check your account or contact support',
    });
  }

  static kycAlreadySubmitted() {
    return new TenantError(TenantErrorCode.KYC_ALREADY_SUBMITTED, {
      suggestion: 'Wait for review or contact support if you need to update',
    });
  }

  static kycNotSubmitted() {
    return new TenantError(TenantErrorCode.KYC_NOT_SUBMITTED, {
      suggestion: 'Submit your KYC information to proceed',
    });
  }

  static invalidCurrency(currency: string, validCurrencies?: string[]) {
    return new TenantError(TenantErrorCode.INVALID_CURRENCY, {
      currency,
      validCurrencies,
      suggestion: 'Use a valid ISO 4217 currency code (e.g., NGN, USD, EUR)',
    });
  }

  static invalidTimezone(timezone: string) {
    return new TenantError(TenantErrorCode.INVALID_TIMEZONE, {
      timezone,
      suggestion:
        'Use a valid IANA timezone identifier (e.g., Africa/Lagos, America/New_York)',
    });
  }

  static suspended() {
    return new TenantError(TenantErrorCode.TENANT_SUSPENDED, {
      suggestion: 'Contact support to resolve the suspension',
    });
  }

  static deleted() {
    return new TenantError(TenantErrorCode.TENANT_DELETED, {
      suggestion: 'Contact support to restore your account',
    });
  }
}
