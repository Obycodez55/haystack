import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino from 'pino';
import {
  LogContext,
  StructuredLogEntry,
  LogLevel,
  BusinessEventType,
} from '../types';
import {
  asyncLocalStorage,
  getRequestContext,
} from '../middleware/correlation.middleware';
import { RequestContext } from '../types/log-context.types';
import { PaymentDataFilter } from '../filters';
import { ErrorFormatter } from '../utils/error-formatter.util';
import { LogSampler } from '../utils/log-sampler.util';
import { LoggerConfigFactory, LoggerConfig } from '../config/logger.config';

/**
 * Structured logger service implementing NestJS LoggerService
 * Uses Pino for high-performance structured logging
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: pino.Logger;
  private readonly serviceName: string;
  private context?: string;

  constructor(private configService: ConfigService) {
    const appConfig = this.configService.get('app');
    const loggingConfig = this.configService.get('logging');

    this.serviceName = appConfig?.name || 'haystack';

    const config: LoggerConfig = {
      service: this.serviceName,
      environment: appConfig?.environment || 'development',
      logLevel: (loggingConfig?.level as LogLevel) || LogLevel.INFO,
      enablePrettyPrint: loggingConfig?.pretty ?? true,
      enableFileLogging: loggingConfig?.fileEnabled ?? false,
      logDir: loggingConfig?.logDir || 'logs',
    };

    this.logger = LoggerConfigFactory.create(config);
  }

  /**
   * Set context for this logger instance
   */
  setContext(context: string) {
    this.context = context;
  }

  /**
   * Build log entry with context and data
   */
  private buildLogEntry(
    level: string,
    message: string,
    data?: any,
    error?: Error | any,
  ): StructuredLogEntry {
    const requestContext = getRequestContext();
    const timestamp = new Date().toISOString();

    // Build log context from request context
    const logContext: LogContext = {
      service: this.serviceName,
      ...(this.context && { component: this.context }),
      ...(requestContext?.correlationId && {
        correlationId: requestContext.correlationId,
      }),
      ...(requestContext?.requestId && {
        requestId: requestContext.requestId,
      }),
      ...(requestContext?.tenantId && { tenantId: requestContext.tenantId }),
      ...(requestContext?.userId && { userId: requestContext.userId }),
      ...(requestContext?.userRole && { userRole: requestContext.userRole }),
      ...(requestContext?.apiKeyId && { apiKeyId: requestContext.apiKeyId }),
      ...(requestContext?.ipAddress && {
        ipAddress: requestContext.ipAddress,
      }),
      ...(requestContext?.userAgent && {
        userAgent: requestContext.userAgent,
      }),
    };

    const entry: StructuredLogEntry = {
      timestamp,
      level,
      message,
      context: logContext,
    };

    // Add filtered data
    if (data) {
      entry.data = PaymentDataFilter.filterAll(data);
    }

    // Add error context
    if (error) {
      entry.error = ErrorFormatter.formatError(error);
    }

    return entry;
  }

  /**
   * Log info message
   */
  log(message: string, data?: any) {
    const entry = this.buildLogEntry(LogLevel.INFO, message, data);
    this.logger.info(entry, message);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | string, data?: any) {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const entry = this.buildLogEntry(LogLevel.ERROR, message, data, errorObj);
    this.logger.error(entry, message);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any) {
    const entry = this.buildLogEntry(LogLevel.WARN, message, data);
    this.logger.warn(entry, message);
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any) {
    const entry = this.buildLogEntry(LogLevel.DEBUG, message, data);
    this.logger.debug(entry, message);
  }

  /**
   * Log verbose message
   */
  verbose(message: string, data?: any) {
    const entry = this.buildLogEntry(LogLevel.VERBOSE, message, data);
    this.logger.trace(entry, message);
  }

  /**
   * Log business event (payment, webhook, etc.)
   */
  logBusinessEvent(
    event: BusinessEventType | string,
    entity: string,
    entityId: string,
    action: string,
    data?: any,
  ) {
    const entry = this.buildLogEntry(
      LogLevel.INFO,
      `Business Event: ${event}`,
      data,
    );
    entry.business = {
      event,
      entity,
      entityId,
      action,
      metadata: data ? PaymentDataFilter.filterAll(data) : undefined,
    };
    this.logger.info(entry, `Business Event: ${event}`);
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, duration: number, data?: any) {
    const entry = this.buildLogEntry(
      LogLevel.INFO,
      `Performance: ${operation}`,
      data,
    );
    entry.performance = {
      duration,
      memoryUsage: process.memoryUsage(),
    };
    this.logger.info(entry, `Performance: ${operation}`);
  }

  /**
   * Log HTTP request/response
   */
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    data?: any,
  ) {
    // Sample high-volume endpoints
    const samplingRate = LogSampler.getSamplingRate(LogLevel.INFO, url);
    if (!LogSampler.shouldSample(samplingRate)) {
      return;
    }

    const entry = this.buildLogEntry(
      LogLevel.INFO,
      `${method} ${url} - ${statusCode}`,
      data,
    );
    entry.context.method = method;
    entry.context.endpoint = url;
    entry.http = {
      method,
      url,
      statusCode,
      duration,
      ...(data?.requestSize && { requestSize: data.requestSize }),
      ...(data?.responseSize && { responseSize: data.responseSize }),
    };
    entry.performance = { duration };

    const level =
      statusCode >= 500
        ? LogLevel.ERROR
        : statusCode >= 400
          ? LogLevel.WARN
          : LogLevel.INFO;
    this.logger[level](entry, `${method} ${url} - ${statusCode}`);
  }

  /**
   * Log payment-specific event
   */
  logPaymentEvent(
    event: BusinessEventType,
    paymentId: string,
    action: string,
    data?: any,
  ) {
    const entry = this.buildLogEntry(
      LogLevel.INFO,
      `Payment Event: ${event}`,
      data,
    );
    entry.context.paymentId = paymentId;
    entry.business = {
      event,
      entity: 'payment',
      entityId: paymentId,
      action,
      metadata: data ? PaymentDataFilter.filterAll(data) : undefined,
    };
    this.logger.info(entry, `Payment Event: ${event}`);
  }

  /**
   * Log provider-specific event
   */
  logProviderEvent(
    provider: string,
    event: string,
    transactionId?: string,
    data?: any,
  ) {
    const entry = this.buildLogEntry(
      LogLevel.INFO,
      `Provider Event: ${provider} - ${event}`,
      data,
    );
    entry.context.provider = provider;
    entry.context.transactionId = transactionId;
    entry.business = {
      event: `provider.${event}`,
      entity: 'provider',
      entityId: provider,
      action: event,
      metadata: data ? PaymentDataFilter.filterAll(data) : undefined,
    };
    this.logger.info(entry, `Provider Event: ${provider} - ${event}`);
  }
}
