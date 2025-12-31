import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

/**
 * TOTP utility functions
 * Handles TOTP secret generation, code verification, and QR code generation
 */

/**
 * Generate a TOTP secret (32 bytes, base32 encoded)
 */
export function generateSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate QR code URL for authenticator apps
 * Format: otpauth://totp/{issuer}:{email}?secret={secret}&issuer={issuer}
 */
export function generateQRCodeUrl(
  secret: string,
  email: string,
  issuer: string = 'Haystack',
): string {
  return authenticator.keyuri(email, issuer, secret);
}

/**
 * Generate QR code as data URI (for embedding in emails/HTML)
 */
export async function generateQRCodeDataUri(
  secret: string,
  email: string,
  issuer: string = 'Haystack',
): Promise<string> {
  const otpauthUrl = generateQRCodeUrl(secret, email, issuer);
  return QRCode.toDataURL(otpauthUrl);
}

/**
 * Verify TOTP code
 * @param secret - The TOTP secret
 * @param code - The 6-digit code from authenticator app
 * @param window - Time window for verification (default: 1, meaning ±30 seconds)
 */
export function verifyTOTPCode(
  secret: string,
  code: string,
  window: number = 1,
): boolean {
  try {
    // otplib authenticator.check accepts (token, secret) and uses options from authenticator.options
    // We need to set the window before checking
    const originalWindow = authenticator.options.window;
    authenticator.options = {
      ...authenticator.options,
      window: [window, window],
    };
    const result = authenticator.check(code, secret);
    // Restore original window
    authenticator.options.window = originalWindow;
    return result;
  } catch {
    return false;
  }
}

/**
 * Generate backup codes
 * @param count - Number of codes to generate (default: 10)
 * @returns Array of backup codes (8 characters each, alphanumeric)
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    codes.push(code);
  }

  return codes;
}

/**
 * Format backup codes for display
 * Groups codes in pairs for better readability
 */
export function formatBackupCodes(codes: string[]): string[] {
  return codes.map((code) => {
    // Format as: ABCD-EFGH
    const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
    return formatted;
  });
}
