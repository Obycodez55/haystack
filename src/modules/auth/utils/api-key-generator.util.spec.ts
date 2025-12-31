import { generateApiKey, extractApiKeyPrefix } from './api-key-generator.util';
import { ApiKeyMode } from '../entities/api-key.entity';

describe('API Key Generator Utilities', () => {
  describe('generateApiKey', () => {
    it('should generate API key for test mode', () => {
      const result = generateApiKey(ApiKeyMode.TEST);

      expect(result).toBeDefined();
      expect(result.key).toBeDefined();
      expect(result.prefix).toBe('sk_test_');
      expect(result.key).toMatch(/^sk_test_/);
      expect(result.key.length).toBeGreaterThan('sk_test_'.length);
    });

    it('should generate API key for live mode', () => {
      const result = generateApiKey(ApiKeyMode.LIVE);

      expect(result).toBeDefined();
      expect(result.key).toBeDefined();
      expect(result.prefix).toBe('sk_live_');
      expect(result.key).toMatch(/^sk_live_/);
      expect(result.key.length).toBeGreaterThan('sk_live_'.length);
    });

    it('should generate different keys each time', () => {
      const result1 = generateApiKey(ApiKeyMode.TEST);
      const result2 = generateApiKey(ApiKeyMode.TEST);

      expect(result1.key).not.toBe(result2.key);
      expect(result1.prefix).toBe(result2.prefix);
    });

    it('should generate keys with sufficient length', () => {
      const result = generateApiKey(ApiKeyMode.TEST);

      // Base64url encoding of 32 bytes = 43 characters (without padding)
      // Plus prefix "sk_test_" = 8 characters
      // Total should be around 51 characters
      expect(result.key.length).toBeGreaterThan(50);
    });

    it('should generate keys with base64url-safe characters', () => {
      const result = generateApiKey(ApiKeyMode.TEST);
      const randomPart = result.key.replace(/^sk_test_/, '');

      // Base64url uses: A-Z, a-z, 0-9, -, _
      expect(randomPart).toMatch(/^[A-Za-z0-9_-]+$/);
      // Should not contain +, /, or = (base64 characters that are URL-unsafe)
      expect(randomPart).not.toMatch(/[+/=]/);
    });
  });

  describe('extractApiKeyPrefix', () => {
    it('should extract prefix from test API key', () => {
      const { key } = generateApiKey(ApiKeyMode.TEST);
      const prefix = extractApiKeyPrefix(key);

      expect(prefix).toBe('sk_test_');
    });

    it('should extract prefix from live API key', () => {
      const { key } = generateApiKey(ApiKeyMode.LIVE);
      const prefix = extractApiKeyPrefix(key);

      expect(prefix).toBe('sk_live_');
    });

    it('should return null for invalid API key format', () => {
      expect(extractApiKeyPrefix('invalid-key')).toBeNull();
      expect(extractApiKeyPrefix('sk_invalid_')).toBeNull();
      expect(extractApiKeyPrefix('')).toBeNull();
    });

    it('should handle keys without prefix', () => {
      expect(extractApiKeyPrefix('just-a-string')).toBeNull();
      expect(extractApiKeyPrefix('sk_')).toBeNull();
    });
  });
});
