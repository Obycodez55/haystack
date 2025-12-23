import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache:key';
export const CACHE_TTL = 'cache:ttl';
export const CACHE_NAMESPACE = 'cache:namespace';

/**
 * Enable caching for a route
 * 
 * @example
 * @Cache('payment', { ttl: 300, namespace: 'payment' })
 * @Get('payments/:id')
 * async getPayment(@Param('id') id: string) { ... }
 */
export const Cache = (
  key: string,
  options?: { ttl?: number; namespace?: string },
) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY, key)(target, propertyKey, descriptor);
    SetMetadata(CACHE_TTL, options?.ttl)(target, propertyKey, descriptor);
    SetMetadata(CACHE_NAMESPACE, options?.namespace)(
      target,
      propertyKey,
      descriptor,
    );
  };
};

/**
 * Invalidate cache after method execution
 */
export const CACHE_INVALIDATE_KEY = 'cache:invalidate:key';
export const CACHE_INVALIDATE_PATTERN = 'cache:invalidate:pattern';

export interface CacheInvalidateOptions {
  /**
   * Pattern to invalidate (supports wildcards)
   * Examples: 'payment:*', 'payment:{id}', 'tenant:*'
   */
  pattern: string;
  
  /**
   * Namespace for the cache
   */
  namespace?: string;
  
  /**
   * Cache tags to invalidate
   */
  tags?: string[];
  
  /**
   * Whether to invalidate immediately or async
   */
  async?: boolean;
}

/**
 * Invalidate cache after method execution
 * 
 * @example
 * @CacheInvalidate({ pattern: 'payment:{id}', namespace: 'payment' })
 * @Patch('payments/:id')
 * async updatePayment(@Param('id') id: string) { ... }
 * 
 * @example
 * @CacheInvalidate({ tags: ['payments', 'tenant:{tenantId}'] })
 * @Post('payments')
 * async createPayment() { ... }
 */
export const CacheInvalidate = (options: CacheInvalidateOptions) => {
  return SetMetadata(CACHE_INVALIDATE_PATTERN, options);
};

