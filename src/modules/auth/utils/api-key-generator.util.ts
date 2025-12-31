import { randomBytes } from 'crypto';
import { ApiKeyMode } from '../entities/api-key.entity';

/**
 * Generate a random API key
 * Format: sk_{mode}_{random}
 * Example: sk_test_abc123def456...
 */
export function generateApiKey(mode: ApiKeyMode): {
  key: string;
  prefix: string;
} {
  // Generate 32 random bytes (256 bits) and encode as base64url
  const randomPart = randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const prefix = `sk_${mode}_`;
  const key = `${prefix}${randomPart}`;

  return {
    key,
    prefix,
  };
}

/**
 * Extract prefix from API key
 */
export function extractApiKeyPrefix(apiKey: string): string | null {
  const match = apiKey.match(/^(sk|pk)_(test|live)_/);
  return match ? match[0] : null;
}
