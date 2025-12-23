import * as bcrypt from 'bcrypt';

/**
 * Hash an API key using bcrypt
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(apiKey, saltRounds);
}

/**
 * Compare an API key with a hash
 */
export async function compareApiKey(
  apiKey: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(apiKey, hash);
}

/**
 * Extract API key from Authorization header
 * Supports: "Bearer sk_test_xxx" or "sk_test_xxx"
 */
export function extractApiKeyFromHeader(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  // Remove "Bearer " prefix if present
  const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();
  return apiKey || null;
}
