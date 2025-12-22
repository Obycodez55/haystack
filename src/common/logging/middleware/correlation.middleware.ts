import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';
import { RequestContext } from '../types/log-context.types';

/**
 * Global async storage for request context
 * Allows access to request context from anywhere in the async call chain
 */
export const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get current request context from async local storage
 */
export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Correlation middleware
 * Extracts or generates correlation ID and request ID
 * Stores context in AsyncLocalStorage for use throughout the request lifecycle
 */
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract correlation ID from header or generate new one
    const correlationId =
      (req.headers['x-correlation-id'] as string) || uuidv4();
    
    // Generate unique request ID
    const requestId = uuidv4();

    // Extract IP address
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';

    // Extract user agent
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Build request context
    const context: RequestContext = {
      correlationId,
      requestId,
      startTime: Date.now(),
      ipAddress,
      userAgent,
      // These will be populated by auth middleware if available
      tenantId: (req as any).tenant?.id,
      userId: (req as any).user?.id,
      userRole: (req as any).user?.role,
      apiKeyId: (req as any).apiKey?.id,
    };

    // Set response headers for client tracking
    res.setHeader('x-correlation-id', correlationId);
    res.setHeader('x-request-id', requestId);

    // Store context in async local storage
    // This allows any code in the request chain to access the context
    asyncLocalStorage.run(context, () => {
      next();
    });
  }
}

