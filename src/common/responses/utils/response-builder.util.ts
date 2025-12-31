import {
  SuccessResponse,
  ErrorResponseStructure,
  ResponseMeta,
  PaginationMeta,
} from '../types/response.types';
import { getRequestContext } from '@logging/middleware/correlation.middleware';

export class ResponseBuilder {
  /**
   * Build success response
   */
  static success<T>(data: T, pagination?: PaginationMeta): SuccessResponse<T> {
    const requestContext = getRequestContext();

    return {
      success: true,
      data,
      meta: {
        requestId: requestContext?.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
      ...(pagination && { pagination }),
    };
  }

  /**
   * Build pagination metadata
   */
  static pagination(
    page: number,
    limit: number,
    total: number,
  ): PaginationMeta {
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Build error response (used by exception filter)
   */
  static error(
    code: string,
    message: string,
    type:
      | 'payment_error'
      | 'provider_error'
      | 'validation_error'
      | 'authentication_error'
      | 'authorization_error'
      | 'rate_limit_error'
      | 'system_error'
      | 'client_error',
    details?: Record<string, any>,
    docUrl?: string,
  ): ErrorResponseStructure {
    const requestContext = getRequestContext();

    return {
      success: false,
      error: {
        code,
        message,
        type,
        ...(details && { details }),
        ...(docUrl && { docUrl }),
      },
      meta: {
        requestId: requestContext?.requestId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
