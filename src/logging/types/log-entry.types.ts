import { LogContext } from './log-context.types';
import { ErrorContext } from './error-context.types';

/**
 * Structured log entry format
 */
export interface StructuredLogEntry {
  // Timestamp
  timestamp: string;

  // Log level
  level: string;

  // Message
  message: string;

  // Context
  context: LogContext;

  // Optional data payload
  data?: Record<string, any>;

  // Error information
  error?: ErrorContext;

  // Performance metrics
  performance?: {
    duration: number;
    memoryUsage?: NodeJS.MemoryUsage;
  };

  // Business event information
  business?: {
    event: string;
    entity: string;
    entityId: string;
    action: string;
    metadata?: Record<string, any>;
  };

  // HTTP request/response information
  http?: {
    method: string;
    url: string;
    statusCode?: number;
    requestSize?: number;
    responseSize?: number;
  };
}

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

/**
 * Business event types for payment orchestration
 */
export enum BusinessEventType {
  // Payment events
  PAYMENT_CREATED = 'payment.created',
  PAYMENT_PROCESSING = 'payment.processing',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_CANCELLED = 'payment.cancelled',
  PAYMENT_REFUNDED = 'payment.refunded',

  // Provider events
  PROVIDER_SELECTED = 'provider.selected',
  PROVIDER_FALLBACK = 'provider.fallback',
  PROVIDER_ERROR = 'provider.error',

  // Webhook events
  WEBHOOK_RECEIVED = 'webhook.received',
  WEBHOOK_PROCESSED = 'webhook.processed',
  WEBHOOK_DELIVERED = 'webhook.delivered',
  WEBHOOK_FAILED = 'webhook.failed',

  // Tenant events
  TENANT_CREATED = 'tenant.created',
  API_KEY_GENERATED = 'api_key.generated',
  API_KEY_REVOKED = 'api_key.revoked',

  // System events
  RECONCILIATION_STARTED = 'reconciliation.started',
  RECONCILIATION_COMPLETED = 'reconciliation.completed',
  RECONCILIATION_DISCREPANCY = 'reconciliation.discrepancy',
}
