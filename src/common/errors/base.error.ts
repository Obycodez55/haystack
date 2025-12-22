import { ErrorType } from '../responses/types/response.types';

/**
 * Base error class that all custom errors extend
 * Ensures consistent error structure and developer-friendly messages
 */
export abstract class BaseError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  abstract readonly type: ErrorType;

  readonly details?: Record<string, any>;
  readonly docUrl?: string;
  readonly cause?: Error;
  readonly userMessage?: string; // Developer-friendly message

  constructor(
    message: string,
    options?: {
      details?: Record<string, any>;
      cause?: Error;
      userMessage?: string;
      docUrl?: string;
    },
  ) {
    super(message);
    this.name = this.constructor.name;
    this.details = options?.details;
    this.cause = options?.cause;
    this.userMessage = options?.userMessage || message;
    this.docUrl = options?.docUrl || this.getDefaultDocUrl();

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert to API error response format
   */
  toErrorResponse() {
    return {
      code: this.code,
      message: this.userMessage || this.message,
      type: this.type,
      details: this.details,
      docUrl: this.docUrl,
    };
  }

  /**
   * Get default documentation URL based on error code
   */
  protected getDefaultDocUrl(): string {
    return `https://docs.yourapp.com/errors/${this.code}`;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return false; // Override in subclasses
  }

  /**
   * Get error context for logging
   */
  getContext() {
    return {
      code: this.code,
      type: this.type,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

