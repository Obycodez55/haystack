import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ApiKeyRepository } from '@modules/auth/repositories/api-key.repository';
import { extractApiKeyFromHeader } from '@modules/auth/utils/api-key-hash.util';
import { asyncLocalStorage } from '@logging/middleware/correlation.middleware';
import { RequestContext } from '@logging/types/log-context.types';
import { AuthenticationError } from '@common/errors/authentication.error';
import { LoggerService } from '@logging/services/logger.service';

/**
 * Tenant middleware
 * Extracts API key from request, validates it, and sets tenant context
 * Must run after CorrelationMiddleware
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly apiKeyRepository: ApiKeyRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('TenantMiddleware');
  }

  async use(req: Request, res: Response, next: NextFunction) {
    // Get existing context from AsyncLocalStorage
    const existingContext = asyncLocalStorage.getStore();

    if (!existingContext) {
      // CorrelationMiddleware should have run first
      this.logger.warn(
        'Request context not found. Ensure CorrelationMiddleware runs before TenantMiddleware',
      );
      return next();
    }

    try {
      // Extract API key from Authorization header
      const authHeader = req.headers.authorization;
      const apiKey = extractApiKeyFromHeader(authHeader);

      if (!apiKey) {
        // Allow requests without API key (for public endpoints, dashboard auth, etc.)
        // The TenantGuard will enforce authentication where needed
        return next();
      }

      // Validate API key by comparing plaintext with stored hash
      // This uses bcrypt.compare() to handle salted hashes correctly
      const apiKeyEntity = await this.apiKeyRepository.validateApiKey(apiKey);

      if (!apiKeyEntity) {
        // Try alternative: maybe the key is already hashed differently
        // Or try direct lookup (some systems store keys differently)
        // For now, throw error
        throw AuthenticationError.invalidApiKey();
      }

      // Validate API key is active
      if (!apiKeyEntity.isActive) {
        throw AuthenticationError.apiKeyRevoked();
      }

      // Check if API key is expired
      if (apiKeyEntity.expiresAt && apiKeyEntity.expiresAt < new Date()) {
        throw AuthenticationError.apiKeyExpired();
      }

      // Check if API key is revoked
      if (apiKeyEntity.revokedAt) {
        throw AuthenticationError.apiKeyRevoked();
      }

      // Get tenant from API key
      const tenant = apiKeyEntity.tenant;
      if (!tenant) {
        this.logger.error(
          'API key found but tenant relation is missing',
          new Error('Tenant relation missing'),
          { apiKeyId: apiKeyEntity.id },
        );
        throw AuthenticationError.invalidApiKey();
      }

      // Validate tenant is active
      if (tenant.status !== 'active') {
        throw new UnauthorizedException(
          `Tenant account is ${tenant.status}. Please contact support.`,
        );
      }

      // Update API key last used timestamp (fire and forget)
      this.apiKeyRepository
        .updateLastUsed(
          apiKeyEntity.id,
          apiKeyEntity.tenantId,
          req.ip || undefined,
        )
        .catch((error) => {
          this.logger.error('Failed to update API key last used', error);
        });

      // Update request context with tenant information
      const updatedContext: RequestContext = {
        ...existingContext,
        tenantId: tenant.id,
        apiKeyId: apiKeyEntity.id,
      } as RequestContext;

      // Store tenant on request object for guards/decorators
      (req as any).tenant = tenant;
      (req as any).apiKey = apiKeyEntity;

      // Update AsyncLocalStorage context
      asyncLocalStorage.run(updatedContext, () => {
        next();
      });
    } catch (error) {
      if (
        error instanceof AuthenticationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      this.logger.error('Error in tenant middleware', error);
      throw AuthenticationError.invalidApiKey();
    }
  }
}
