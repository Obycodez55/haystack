import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { TenantStatus } from '@modules/tenant/entities/tenant.entity';
import { JwtConfig } from '@config/jwt.config';
import { toError } from '@common/utils/error.util';

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  sub: string; // Tenant ID
  email: string;
  name: string;
  type?: string; // 'verification', 'reset', 'temporary', or undefined (access token)
  iat?: number;
  exp?: number;
}

/**
 * JWT Auth Service
 * Handles JWT token validation, generation, and payload extraction
 */
@Injectable()
export class JwtAuthService {
  private readonly jwtConfig: JwtConfig;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tenantRepository: TenantRepository,
  ) {
    const config = this.configService.get<JwtConfig>('jwt');
    if (!config) {
      throw new Error('JWT configuration is missing');
    }
    this.jwtConfig = config;
  }

  /**
   * Sign a JWT token with the default secret
   */
  sign(payload: object, options?: { expiresIn?: string }): string {
    return this.jwtService.sign(payload, {
      secret: this.jwtConfig.secret,
      expiresIn: options?.expiresIn || this.jwtConfig.expiresIn,
    } as any);
  }

  /**
   * Sign a JWT token with a custom secret
   */
  signWithSecret(
    payload: object,
    secret: string,
    options?: { expiresIn?: string },
  ): string {
    return this.jwtService.sign(payload, {
      secret,
      expiresIn: options?.expiresIn,
    } as any);
  }

  /**
   * Verify a JWT token with the default secret
   */
  verify<T extends object = JwtPayload>(token: string): T {
    return this.jwtService.verify<T>(token, {
      secret: this.jwtConfig.secret,
    });
  }

  /**
   * Verify a JWT token with a custom secret
   */
  verifyWithSecret<T extends object = JwtPayload>(
    token: string,
    secret: string,
  ): T {
    return this.jwtService.verify<T>(token, {
      secret,
    });
  }

  /**
   * Validate JWT token and return payload
   */
  async validateToken(token: string): Promise<JwtPayload> {
    try {
      // Verify token
      const payload = this.verify<JwtPayload>(token);

      // Verify tenant exists and is active
      const tenant = await this.tenantRepository.findById(payload.sub);
      if (!tenant) {
        throw new UnauthorizedException('Tenant not found');
      }

      if (tenant.status !== TenantStatus.ACTIVE) {
        throw new UnauthorizedException('Tenant account is not active');
      }

      return payload;
    } catch (error) {
      const errorObj = toError(error);
      if (errorObj.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      if (errorObj.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    // Support "Bearer <token>" format
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }

    // Also support just the token
    return authHeader.trim() || null;
  }

  /**
   * Get user context from validated token
   */
  async getUserFromToken(token: string): Promise<{
    tenantId: string;
    email: string;
    name: string;
  }> {
    const payload = await this.validateToken(token);
    return {
      tenantId: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  }

  /**
   * Generate email verification token
   * Short-lived token (24 hours) for email verification
   */
  generateVerificationToken(tenantId: string, email: string): string {
    return this.sign(
      {
        sub: tenantId,
        email,
        type: 'verification',
      },
      {
        expiresIn: '24h',
      },
    );
  }

  /**
   * Generate password reset token
   * Short-lived token (1 hour) for password reset
   */
  generateResetToken(tenantId: string, email: string): string {
    return this.sign(
      {
        sub: tenantId,
        email,
        type: 'reset',
      },
      {
        expiresIn: '1h',
      },
    );
  }

  /**
   * Generate temporary token for 2FA verification
   * Very short-lived token (5 minutes) for 2FA flow
   */
  generateTemporaryToken(tenantId: string, email: string): string {
    return this.sign(
      {
        sub: tenantId,
        email,
        type: 'temporary',
      },
      {
        expiresIn: '5m',
      },
    );
  }

  /**
   * Verify token and extract payload (without tenant validation)
   * Use this for verification/reset tokens that don't need tenant validation
   */
  verifyToken<T extends object = JwtPayload>(token: string): T | null {
    try {
      return this.verify<T>(token);
    } catch {
      return null;
    }
  }

  /**
   * Verify refresh token and return payload
   * Uses refresh secret instead of default secret
   */
  verifyRefreshToken<T extends object = JwtPayload>(token: string): T | null {
    try {
      return this.verifyWithSecret<T>(token, this.jwtConfig.refreshSecret);
    } catch {
      return null;
    }
  }

  /**
   * Generate access token for tenant
   */
  generateAccessToken(tenantId: string, email: string, name: string): string {
    return this.sign(
      {
        sub: tenantId,
        email,
        name,
      },
      {
        expiresIn: this.jwtConfig.expiresIn,
      },
    );
  }

  /**
   * Generate refresh token for tenant
   */
  generateRefreshToken(tenantId: string, email: string, name: string): string {
    return this.signWithSecret(
      {
        sub: tenantId,
        email,
        name,
      },
      this.jwtConfig.refreshSecret,
      {
        expiresIn: this.jwtConfig.refreshExpiresIn,
      },
    );
  }

  /**
   * Generate both access and refresh tokens for tenant
   */
  generateTokens(
    tenantId: string,
    email: string,
    name: string,
  ): {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } {
    const accessToken = this.generateAccessToken(tenantId, email, name);
    const refreshToken = this.generateRefreshToken(tenantId, email, name);

    // Parse expiresIn (e.g., "15m" -> 900 seconds)
    const expiresInSeconds = this.parseExpiresIn(this.jwtConfig.expiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Parse expiresIn string to seconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900; // Default 15 minutes
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900;
    }
  }
}
