import { ErrorContext, ErrorCategory } from '../types/error-context.types';

/**
 * Extract error context from an Error object
 */
export class ErrorFormatter {
  /**
   * Format error into structured error context
   */
  static formatError(error: Error | any): ErrorContext {
    const context: ErrorContext = {
      name: error?.name || 'Error',
      message: error?.message || String(error),
    };

    // Add stack trace if available
    if (error?.stack) {
      context.stack = error.stack;
    }

    // Add error code if available
    if (error?.code) {
      context.code = error.code;
    }

    // Add HTTP status code if available
    if (error?.status || error?.statusCode) {
      context.statusCode = error.status || error.statusCode;
    }

    // Add cause if available (for nested errors)
    if (error?.cause) {
      context.cause = this.formatError(error.cause);
    }

    // Extract metadata from error
    if (error?.metadata || error?.context) {
      context.metadata = {
        ...(error.metadata || {}),
        ...(error.context || {}),
      };
    }

    return context;
  }

  /**
   * Categorize error based on error type and message
   */
  static categorizeError(error: Error | any): ErrorCategory {
    const errorName = error?.name?.toLowerCase() || '';
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = String(error?.code || '').toLowerCase();

    // Payment errors
    if (
      errorName.includes('payment') ||
      errorMessage.includes('payment') ||
      errorCode.includes('payment')
    ) {
      return ErrorCategory.PAYMENT;
    }

    // Provider errors
    if (
      errorName.includes('provider') ||
      errorMessage.includes('provider') ||
      errorMessage.includes('paystack') ||
      errorMessage.includes('stripe') ||
      errorMessage.includes('flutterwave')
    ) {
      return ErrorCategory.PROVIDER;
    }

    // Validation errors
    if (
      errorName.includes('validation') ||
      errorName.includes('validator') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('validation')
    ) {
      return ErrorCategory.VALIDATION;
    }

    // Authentication errors
    if (
      errorName.includes('unauthorized') ||
      errorName.includes('authentication') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('api key') ||
      errorCode === '401'
    ) {
      return ErrorCategory.AUTHENTICATION;
    }

    // Authorization errors
    if (
      errorName.includes('forbidden') ||
      errorName.includes('authorization') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('permission') ||
      errorCode === '403'
    ) {
      return ErrorCategory.AUTHORIZATION;
    }

    // Database errors
    if (
      errorName.includes('database') ||
      errorName.includes('query') ||
      errorName.includes('sql') ||
      errorMessage.includes('database') ||
      errorMessage.includes('connection')
    ) {
      return ErrorCategory.DATABASE;
    }

    // Network errors
    if (
      errorName.includes('network') ||
      errorName.includes('timeout') ||
      errorName.includes('econnrefused') ||
      errorMessage.includes('network') ||
      errorMessage.includes('timeout')
    ) {
      return ErrorCategory.NETWORK;
    }

    // Default to system error
    return ErrorCategory.SYSTEM;
  }

  /**
   * Extract user-friendly error message
   */
  static getUserFriendlyMessage(error: Error | any): string {
    const message = error?.message || String(error);

    // Map technical errors to user-friendly messages
    if (message.includes('ECONNREFUSED')) {
      return 'Service temporarily unavailable. Please try again later.';
    }

    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }

    if (message.includes('validation')) {
      return 'Invalid input provided. Please check your request.';
    }

    // Return original message if no mapping found
    return message;
  }
}

