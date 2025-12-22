/**
 * Base response structure - used for both success and error responses
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  meta: ResponseMeta;
  pagination?: PaginationMeta;
}

/**
 * Success response structure
 */
export interface SuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data: T;
  error?: never;
}

/**
 * Error response structure
 */
export interface ErrorResponseStructure extends ApiResponse {
  success: false;
  data?: never;
  error: ErrorResponse;
}

/**
 * Error object in response
 */
export interface ErrorResponse {
  code: string;
  message: string;
  type: ErrorType;
  details?: Record<string, any>;
  docUrl?: string;
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  requestId: string;
  timestamp: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Error types matching API spec
 */
export type ErrorType =
  | 'payment_error'
  | 'provider_error'
  | 'validation_error'
  | 'authentication_error'
  | 'authorization_error'
  | 'rate_limit_error'
  | 'system_error'
  | 'client_error';

