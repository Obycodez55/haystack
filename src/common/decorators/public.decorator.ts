import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for public routes
 * Routes marked with @Public() will skip authentication
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark endpoint as public (no authentication required)
 * Use this for health checks, public docs, etc.
 *
 * @example
 * @Public()
 * @Get('health')
 * getHealth() {
 *   return { status: 'ok' };
 * }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
