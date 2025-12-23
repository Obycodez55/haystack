import { BaseError } from '@errors';

export class RateLimitExceededError extends BaseError {
  readonly code = 'rate_limit_exceeded';
  readonly statusCode = 429;
  readonly type = 'rate_limit_error' as const;

  constructor(details: {
    limit: number;
    remaining: number;
    resetAt: Date;
    retryAfter: number;
    message?: string;
  }) {
    const userMessage = details.message || 
      `Rate limit exceeded. You can make ${details.limit} requests per hour. Try again in ${details.retryAfter} seconds.`;

    super(userMessage, {
      details: {
        errorCode: 'rate_limit_exceeded',
        limit: details.limit,
        remaining: details.remaining,
        resetAt: details.resetAt.toISOString(),
        retryAfter: details.retryAfter,
      },
      userMessage,
      docUrl: 'https://docs.yourapp.com/errors/rate_limit_exceeded',
    });
  }
}

