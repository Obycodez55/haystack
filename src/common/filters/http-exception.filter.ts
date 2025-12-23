import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService, getRequestContext } from '@common';
import { BaseError } from '@errors';
import { ResponseBuilder, ErrorType } from '@responses';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      getRequestContext()?.requestId ||
      (request.headers['x-request-id'] as string) ||
      'unknown';

    // Handle our custom BaseError instances
    if (exception instanceof BaseError) {
      const errorResponse = ResponseBuilder.error(
        exception.code,
        exception.userMessage || exception.message,
        exception.type,
        exception.details,
        exception.docUrl,
      );

      // Log error with context
      this.logger.error(
        `Request failed: ${request.method} ${request.url}`,
        exception,
        {
          requestId,
          ...exception.getContext(),
        },
      );

      return response.status(exception.statusCode).json(errorResponse);
    }

    // Handle NestJS HttpException (includes ValidationPipe errors)
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      const { code, message, type, details } = this.parseHttpException(
        statusCode,
        exceptionResponse,
      );

      const errorResponse = ResponseBuilder.error(code, message, type, details);

      this.logger.error(
        `HTTP Exception: ${request.method} ${request.url}`,
        exception,
        {
          statusCode,
          requestId,
          errorCode: code,
          errorType: type,
        },
      );

      return response.status(statusCode).json(errorResponse);
    }

    // Handle unknown/unexpected errors
    const errorResponse = ResponseBuilder.error(
      'internal_server_error',
      'An unexpected error occurred. Please try again or contact support.',
      'system_error',
      process.env.NODE_ENV === 'development'
        ? { originalError: String(exception) }
        : undefined,
    );

    this.logger.error(
      `Unhandled error: ${request.method} ${request.url}`,
      exception instanceof Error ? exception : new Error(String(exception)),
      {
        requestId,
        statusCode: 500,
      },
    );

    return response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(errorResponse);
  }

  /**
   * Parse NestJS HttpException into our error format
   */
  private parseHttpException(
    statusCode: number,
    exceptionResponse: any,
  ): {
    code: string;
    message: string;
    type: ErrorType;
    details?: Record<string, any>;
  } {
    // Handle ValidationPipe errors (class-validator)
    if (Array.isArray(exceptionResponse?.message)) {
      const messages = exceptionResponse.message as string[];
      const firstMessage = messages[0];

      return {
        code: 'validation_error',
        message: firstMessage || 'Validation failed',
        type: 'validation_error',
        details: {
          errors: messages,
          suggestion: 'Please check your request data and try again',
        },
      };
    }

    // Handle string messages
    if (typeof exceptionResponse === 'string') {
      return {
        code: this.getErrorCode(statusCode),
        message: exceptionResponse,
        type: this.getErrorType(statusCode),
      };
    }

    // Handle object responses
    if (typeof exceptionResponse === 'object') {
      return {
        code: exceptionResponse.code || this.getErrorCode(statusCode),
        message: exceptionResponse.message || 'An error occurred',
        type: exceptionResponse.type || this.getErrorType(statusCode),
        details: exceptionResponse.details,
      };
    }

    // Fallback
    return {
      code: this.getErrorCode(statusCode),
      message: 'An error occurred',
      type: this.getErrorType(statusCode),
    };
  }

  private getErrorCode(statusCode: number): string {
    const codeMap: Record<number, string> = {
      400: 'bad_request',
      401: 'authentication_error',
      403: 'authorization_error',
      404: 'not_found',
      409: 'conflict',
      429: 'rate_limit_exceeded',
      500: 'internal_server_error',
      502: 'bad_gateway',
      503: 'service_unavailable',
    };
    return codeMap[statusCode] || 'unknown_error';
  }

  private getErrorType(statusCode: number): ErrorType {
    if (statusCode >= 500) return 'system_error';
    if (statusCode === 401) return 'authentication_error';
    if (statusCode === 403) return 'authorization_error';
    if (statusCode === 400 || statusCode === 422) return 'validation_error';
    if (statusCode === 429) return 'rate_limit_error';
    return 'client_error';
  }
}
