/**
 * Request context stored in AsyncLocalStorage
 */
export interface RequestContext {
  correlationId: string;
  requestId: string;
  startTime: number;
  tenantId?: string;
  userId?: string;
  userRole?: string;
  apiKeyId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log context included in every log entry
 */
export interface LogContext {
  // Request tracking
  correlationId?: string;
  requestId?: string;

  // Service identification
  service: string;
  component?: string;
  method?: string;
  endpoint?: string;

  // User context
  tenantId?: string;
  userId?: string;
  userRole?: string;
  apiKeyId?: string;

  // Request metadata
  ipAddress?: string;
  userAgent?: string;

  // Payment-specific context
  paymentId?: string;
  provider?: string;
  transactionId?: string;
}
