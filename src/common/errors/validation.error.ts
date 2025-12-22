import { BaseError } from './base.error';

export enum ValidationErrorCode {
  ERROR = 'validation_error',
  MISSING_FIELD = 'missing_required_field',
  INVALID_VALUE = 'invalid_field_value',
  INVALID_EMAIL = 'invalid_email',
  INVALID_CURRENCY = 'invalid_currency',
}

const ERROR_MESSAGES: Record<ValidationErrorCode, string> = {
  [ValidationErrorCode.ERROR]:
    'The request data is invalid. Please check your input and try again.',
  [ValidationErrorCode.MISSING_FIELD]:
    'A required field is missing. Please include all required fields.',
  [ValidationErrorCode.INVALID_VALUE]:
    'One or more field values are invalid. Please check your input.',
  [ValidationErrorCode.INVALID_EMAIL]:
    'The email address format is invalid. Please provide a valid email.',
  [ValidationErrorCode.INVALID_CURRENCY]:
    'The currency code is invalid. Please use a valid ISO 4217 currency code.',
};

export class ValidationError extends BaseError {
  readonly code: ValidationErrorCode;
  readonly statusCode = 400;
  readonly type = 'validation_error' as const;
  readonly field?: string;

  constructor(
    code: ValidationErrorCode,
    field?: string,
    details?: Record<string, any>,
    customMessage?: string,
  ) {
    const message = customMessage || ERROR_MESSAGES[code];

    super(message, {
      details: {
        field,
        errorCode: code,
        ...details,
      },
      userMessage: message,
      docUrl: `https://docs.yourapp.com/errors/${code}`,
    });

    this.code = code;
    this.field = field;
  }

  /**
   * Factory methods
   */
  static missingField(field: string, details?: Record<string, any>) {
    return new ValidationError(
      ValidationErrorCode.MISSING_FIELD,
      field,
      {
        field,
        suggestion: `Please include the '${field}' field in your request`,
        ...details,
      },
    );
  }

  static invalidValue(field: string, value: any, constraint?: string) {
    return new ValidationError(
      ValidationErrorCode.INVALID_VALUE,
      field,
      {
        field,
        value,
        constraint,
        suggestion: `Please provide a valid value for '${field}'`,
      },
    );
  }

  static invalidEmail(email: string) {
    return new ValidationError(
      ValidationErrorCode.INVALID_EMAIL,
      'email',
      {
        field: 'email',
        value: email,
        suggestion: 'Please provide a valid email address (e.g., user@example.com)',
      },
    );
  }

  static invalidCurrency(currency: string, supportedCurrencies?: string[]) {
    return new ValidationError(
      ValidationErrorCode.INVALID_CURRENCY,
      'currency',
      {
        field: 'currency',
        value: currency,
        supportedCurrencies,
        suggestion: 'Please use a valid ISO 4217 currency code',
      },
    );
  }
}

