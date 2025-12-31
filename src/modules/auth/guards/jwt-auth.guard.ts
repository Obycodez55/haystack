import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtAuthService } from '../services/jwt-auth.service';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { RequestUser } from '../types/request-user.interface';

/**
 * JWT Auth Guard
 * Validates JWT tokens and extracts user context
 * Can be bypassed with @Public() decorator
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtAuthService: JwtAuthService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public (bypasses authentication)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.jwtAuthService.extractTokenFromHeader(
      request.headers.authorization,
    );

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Validate token and get user context
      const user = await this.jwtAuthService.getUserFromToken(token);

      // Attach user to request object
      (request as Request & { user: RequestUser }).user = user;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
