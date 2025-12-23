export interface CacheOptions {
  /**
   * Time to live in seconds
   * 0 = no expiration
   */
  ttl?: number;

  /**
   * Cache namespace (e.g., 'payment', 'provider', 'tenant')
   */
  namespace?: string;

  /**
   * Cache tags for bulk invalidation
   */
  tags?: string[];
}

export interface CacheResult<T> {
  value: T;
  cached: boolean;
}

