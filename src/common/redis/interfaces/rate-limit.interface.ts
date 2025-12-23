export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  requests: number;

  /**
   * Time window in seconds
   * Examples: 60 (1 minute), 3600 (1 hour), 86400 (1 day)
   */
  window: number;

  /**
   * Optional: Custom identifier for rate limiting
   * Default: Uses tenantId + apiKeyId
   */
  identifier?: string;

  /**
   * Optional: Whether to skip rate limiting for this route
   * Useful for health checks, webhooks, etc.
   */
  skip?: boolean;

  /**
   * Optional: Custom error message when limit is exceeded
   */
  errorMessage?: string;

  /**
   * Optional: Whether to include rate limit headers in response
   * Default: true
   */
  includeHeaders?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in milliseconds
  retryAfter: number; // Seconds until reset
  fallback?: boolean; // True if Redis failed and fallback was used
}

