import { cloneDeep } from 'lodash';
import { SensitiveDataFilter } from './sensitive-data.filter';

/**
 * Payment-specific sensitive fields
 */
const PAYMENT_SENSITIVE_FIELDS = [
  // Card data
  'card_number',
  'cardNumber',
  'card_number_last4',
  'cardNumberLast4',
  'cvv',
  'cvv2',
  'cvc',
  'card_pin',
  'cardPin',
  'expiry',
  'expiry_date',
  'expiryDate',
  
  // Bank account
  'bank_account',
  'bankAccount',
  'account_number',
  'accountNumber',
  'routing_number',
  'routingNumber',
  'sort_code',
  'sortCode',
  
  // Payment tokens
  'payment_token',
  'paymentToken',
  'gateway_response',
  'gatewayResponse',
  'provider_response',
  'providerResponse',
  'provider_data',
  'providerData',
  
  // API keys and credentials
  'api_key',
  'apiKey',
  'secret_key',
  'secretKey',
  'public_key',
  'publicKey',
  'provider_api_key',
  'providerApiKey',
  'provider_secret',
  'providerSecret',
  
  // Webhook signatures
  'signature',
  'webhook_signature',
  'webhookSignature',
  'hmac_signature',
  'hmacSignature',
  
  // Customer sensitive data
  'bvn',
  'nin',
  'ssn',
  'tax_id',
  'taxId',
];

/**
 * Payment-specific data filter
 * Extends general sensitive data filter with payment-specific fields
 */
export class PaymentDataFilter {
  /**
   * Filter payment-specific sensitive data
   */
  static filterPaymentData(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    try {
      const filtered = structuredClone ? structuredClone(obj) : cloneDeep(obj);
      this.recursiveFilter(filtered);
      return filtered;
    } catch {
      const filtered = cloneDeep(obj);
      this.recursiveFilter(filtered);
      return filtered;
    }
  }

  /**
   * Recursively filter payment-sensitive fields
   */
  private static recursiveFilter(obj: any): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item) => this.recursiveFilter(item));
      return;
    }

    Object.keys(obj).forEach((key) => {
      const lowerKey = key.toLowerCase();

      // Check for payment-sensitive fields
      if (
        PAYMENT_SENSITIVE_FIELDS.some((field) =>
          lowerKey.includes(field.toLowerCase())
        )
      ) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.recursiveFilter(obj[key]);
      }
    });
  }

  /**
   * Filter payment data, then apply general sensitive data filter
   */
  static filterAll(obj: any): any {
    const paymentFiltered = this.filterPaymentData(obj);
    return SensitiveDataFilter.filterObject(paymentFiltered);
  }
}

