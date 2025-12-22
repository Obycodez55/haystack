/**
 * Structured error context for logging
 */
export interface ErrorContext {
  name: string;
  message: string;
  stack?: string;
  code?: string | number;
  statusCode?: number;
  cause?: ErrorContext;
  metadata?: Record<string, any>;
}

/**
 * Error categories for better error handling
 */
export enum ErrorCategory {
  PAYMENT = 'payment',
  PROVIDER = 'provider',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  NETWORK = 'network',
  SYSTEM = 'system',
  BUSINESS_LOGIC = 'business_logic',
}

