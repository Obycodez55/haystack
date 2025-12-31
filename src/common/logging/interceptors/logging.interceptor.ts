import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggerService } from '../services/logger.service';
import { PaymentDataFilter } from '../filters';

/**
 * Logging interceptor for HTTP requests
 * Logs incoming requests and responses with performance metrics
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const { method, originalUrl, body, query, params, headers } = request;
    const userAgent = headers['user-agent'];
    const ipAddress =
      (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (headers['x-real-ip'] as string) ||
      request.ip ||
      'unknown';

    // Log incoming request (filter sensitive data)
    const filteredBody = body ? PaymentDataFilter.filterAll(body) : null;
    const filteredQuery = query ? PaymentDataFilter.filterAll(query) : null;
    const filteredParams = params ? PaymentDataFilter.filterAll(params) : null;

    this.logger.debug('Incoming Request', {
      method,
      url: originalUrl,
      query: filteredQuery,
      params: filteredParams,
      userAgent,
      ipAddress,
      bodyKeys: filteredBody ? Object.keys(filteredBody) : [],
      contentType: headers['content-type'],
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const responseSize = data ? JSON.stringify(data).length : 0;

        // Log successful response
        this.logger.logRequest(
          method,
          originalUrl,
          response.statusCode,
          duration,
          {
            responseSize,
            userAgent,
            ipAddress,
          },
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Log error response
        this.logger.error(`Request failed: ${method} ${originalUrl}`, error, {
          statusCode: error.status || error.statusCode || 500,
          duration,
          userAgent,
          ipAddress,
          body: filteredBody ? Object.keys(filteredBody) : [],
          query: filteredQuery ? Object.keys(filteredQuery) : [],
          params: filteredParams ? Object.keys(filteredParams) : [],
        });

        throw error;
      }),
    );
  }
}
