const KEY_SEPARATOR = ':';

/**
 * Build Redis key with prefix
 */
export function buildKey(parts: string[], prefix?: string): string {
  const allParts = prefix ? [prefix, ...parts] : parts;
  return allParts.join(KEY_SEPARATOR);
}

/**
 * Build rate limit key
 */
export function buildRateLimitKey(
  identifier: string,
  mode: 'test' | 'live',
  window: number,
): string {
  return buildKey(['rate_limit', mode, identifier, `w${window}`]);
}

/**
 * Build cache key
 */
export function buildCacheKey(key: string, namespace?: string): string {
  const parts = ['cache'];
  if (namespace) parts.push(namespace);
  parts.push(key);
  return buildKey(parts);
}

/**
 * Build idempotency key
 */
export function buildIdempotencyKey(
  tenantId: string,
  idempotencyKey: string,
): string {
  return buildKey(['idempotency', tenantId, idempotencyKey]);
}

/**
 * Build lock key
 */
export function buildLockKey(resourceType: string, resourceId: string): string {
  return buildKey(['lock', resourceType, resourceId]);
}

