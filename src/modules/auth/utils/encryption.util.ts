import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';

/**
 * Encryption utility for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 *
 * Note: In production, consider using AWS KMS or similar key management service
 */
export class EncryptionUtil {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits

  constructor(private readonly encryptionKey: string) {
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error(
        'Encryption key must be at least 32 characters long. Set ENCRYPTION_KEY environment variable.',
      );
    }
  }

  /**
   * Encrypt plaintext data
   * Returns base64-encoded string: iv:tag:encrypted
   */
  encrypt(plaintext: string): string {
    try {
      // Derive key from encryption key (simple hash for now)
      // In production, use proper key derivation (PBKDF2, scrypt, etc.)
      const key = Buffer.from(
        this.encryptionKey.slice(0, this.keyLength),
        'utf8',
      );

      // Generate random IV
      const iv = randomBytes(this.ivLength);

      // Create cipher
      const cipher = createCipheriv(this.algorithm, key, iv);

      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine: iv:tag:encrypted
      return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;
    } catch (error) {
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Decrypt encrypted data
   * Expects base64-encoded string: iv:tag:encrypted
   */
  decrypt(encryptedData: string): string {
    try {
      // Split: iv:tag:encrypted
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivBase64, tagBase64, encrypted] = parts;

      // Derive key
      const key = Buffer.from(
        this.encryptionKey.slice(0, this.keyLength),
        'utf8',
      );

      // Decode IV and tag
      const iv = Buffer.from(ivBase64, 'base64');
      const tag = Buffer.from(tagBase64, 'base64');

      // Create decipher
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      // Decrypt
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

/**
 * Create encryption utility instance from config
 */
export function createEncryptionUtil(
  configService: ConfigService,
): EncryptionUtil {
  const encryptionKey = configService.get<string>('ENCRYPTION_KEY');

  if (!encryptionKey) {
    // For development, generate a default key (NOT for production!)
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ENCRYPTION_KEY is required in production. Set it in your environment variables.',
      );
    }
    // Development fallback - should be replaced with proper key
    const defaultKey = 'development-key-not-for-production-use-32chars';
    console.warn(
      '⚠️  WARNING: Using default encryption key. Set ENCRYPTION_KEY in production!',
    );
    return new EncryptionUtil(defaultKey);
  }

  return new EncryptionUtil(encryptionKey);
}
