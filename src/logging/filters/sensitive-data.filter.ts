import { cloneDeep } from 'lodash';

/**
 * Fields that should be completely redacted
 */
const SENSITIVE_FIELDS = [
  'password',
  'password_hash',
  'passwordHash',
  'pin',
  'pin_hash',
  'pinHash',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'cookie',
  'session_token',
  'sessionToken',
  'secret',
  'api_secret',
  'apiSecret',
  'private_key',
  'privateKey',
  'secret_key',
  'secretKey',
];

/**
 * Fields that should be partially masked (show some characters)
 */
const PARTIAL_MASK_FIELDS = [
  'email',
  'phone',
  'phone_number',
  'phoneNumber',
  'mobile',
  'account_number',
  'accountNumber',
  'license_number',
  'licenseNumber',
  'employee_id',
  'employeeId',
];

/**
 * Filters sensitive data from objects recursively
 */
export class SensitiveDataFilter {
  /**
   * Filter sensitive data from an object
   */
  static filterObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    // Use structured clone for better performance than lodash cloneDeep
    // but fallback to lodash for complex objects
    try {
      const filtered = structuredClone ? structuredClone(obj) : cloneDeep(obj);
      this.recursiveFilter(filtered);
      return filtered;
    } catch {
      // Fallback to lodash for objects with functions, circular refs, etc.
      const filtered = cloneDeep(obj);
      this.recursiveFilter(filtered);
      return filtered;
    }
  }

  /**
   * Recursively filter sensitive fields
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

      // Check for sensitive fields (case-insensitive, partial match)
      if (
        SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))
      ) {
        obj[key] = '[REDACTED]';
      } else if (
        PARTIAL_MASK_FIELDS.some((field) =>
          lowerKey.includes(field.toLowerCase()),
        )
      ) {
        obj[key] = this.partialMask(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.recursiveFilter(obj[key]);
      }
    });
  }

  /**
   * Partially mask a value (show some characters for debugging)
   */
  private static partialMask(value: any): string {
    if (!value || typeof value !== 'string') {
      return value;
    }

    // Email masking: us***@example.com
    if (value.includes('@')) {
      const [user, domain] = value.split('@');
      if (user && domain) {
        const maskedUser =
          user.length > 2 ? `${user.substring(0, 2)}***` : '***';
        return `${maskedUser}@${domain}`;
      }
    }

    // Phone/ID masking: +234***12 or 123***45
    if (value.length > 6) {
      return `${value.substring(0, 3)}***${value.substring(value.length - 2)}`;
    }

    // Short values: mask completely
    return '***';
  }
}
