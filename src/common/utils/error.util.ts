/**
 * Error handling utilities
 * Provides consistent error handling patterns across the application
 */

/**
 * Extract error message from unknown error type
 * @param error - Error of unknown type
 * @returns Error message string
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Convert unknown error type to Error object
 * @param error - Error of unknown type
 * @returns Error object
 */
export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
