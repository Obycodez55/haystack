import { BaseError } from './base.error';

export enum PaymentErrorCode {
  INVALID_AMOUNT = 'invalid_amount',
  INVALID_CURRENCY = 'invalid_currency',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  CARD_DECLINED = 'card_declined',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_NOT_FOUND = 'payment_not_found',
  PAYMENT_ALREADY_PROCESSED = 'payment_already_processed',
  REFUND_FAILED = 'refund_failed',
  REFUND_NOT_ALLOWED = 'refund_not_allowed',
}

/**
 * Error messages that developers can easily understand and act upon
 */
const ERROR_MESSAGES: Record<PaymentErrorCode, string> = {
  [PaymentErrorCode.INVALID_AMOUNT]:
    'The payment amount is invalid. Amount must be greater than 0 and within allowed limits.',
  [PaymentErrorCode.INVALID_CURRENCY]:
    'The currency code is not supported. Please use a valid currency code (e.g., NGN, USD, EUR).',
  [PaymentErrorCode.INSUFFICIENT_FUNDS]:
    'The customer does not have sufficient funds to complete this payment.',
  [PaymentErrorCode.CARD_DECLINED]:
    'The payment card was declined by the bank. Please try a different payment method.',
  [PaymentErrorCode.PAYMENT_FAILED]:
    'The payment could not be processed. Please try again or contact support.',
  [PaymentErrorCode.PAYMENT_NOT_FOUND]:
    'The payment you are looking for does not exist. Please check the payment ID.',
  [PaymentErrorCode.PAYMENT_ALREADY_PROCESSED]:
    'This payment has already been processed and cannot be modified.',
  [PaymentErrorCode.REFUND_FAILED]:
    'The refund could not be processed. Please try again or contact support.',
  [PaymentErrorCode.REFUND_NOT_ALLOWED]:
    'Refunds are not allowed for this payment. Check payment status or contact support.',
};

export class PaymentError extends BaseError {
  readonly code: PaymentErrorCode;
  readonly statusCode = 400;
  readonly type = 'payment_error' as const;

  constructor(
    code: PaymentErrorCode,
    details?: Record<string, any>,
    cause?: Error,
    customMessage?: string, // Allow override for specific cases
  ) {
    const message = customMessage || ERROR_MESSAGES[code];

    super(message, {
      details: {
        ...details,
        errorCode: code, // Include code in details for easy access
      },
      cause,
      userMessage: message, // Developer-friendly message
      docUrl: `https://docs.yourapp.com/errors/${code}`,
    });

    this.code = code;
  }

  /**
   * Static factory methods for common errors
   */
  static invalidAmount(amount: number, details?: Record<string, any>) {
    return new PaymentError(PaymentErrorCode.INVALID_AMOUNT, {
      field: 'amount',
      value: amount,
      constraint: 'must be positive and within limits',
      ...details,
    });
  }

  static invalidCurrency(currency: string, supportedCurrencies?: string[]) {
    return new PaymentError(PaymentErrorCode.INVALID_CURRENCY, {
      field: 'currency',
      value: currency,
      supportedCurrencies,
    });
  }

  static paymentNotFound(paymentId: string) {
    return new PaymentError(PaymentErrorCode.PAYMENT_NOT_FOUND, {
      paymentId,
      suggestion: 'Verify the payment ID and try again',
    });
  }

  static paymentFailed(paymentId: string, reason?: string, cause?: Error) {
    return new PaymentError(
      PaymentErrorCode.PAYMENT_FAILED,
      {
        paymentId,
        reason,
        suggestion: 'Check payment status or try again',
      },
      cause,
    );
  }
}
