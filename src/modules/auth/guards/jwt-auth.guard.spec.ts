import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtAuthService } from '../services/jwt-auth.service';
import { RequestUser } from '../types/request-user.interface';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtAuthService: jest.Mocked<JwtAuthService>;
  let reflector: jest.Mocked<Reflector>;

  const mockUser: RequestUser = {
    tenantId: 'tenant-1',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(async () => {
    const mockJwtAuthService = {
      extractTokenFromHeader: jest.fn(),
      getUserFromToken: jest.fn(),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtAuthService,
          useValue: mockJwtAuthService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtAuthService = module.get(JwtAuthService);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    const createMockContext = (
      authorization?: string,
      isPublic = false,
    ): ExecutionContext => {
      const request = {
        headers: {
          authorization,
        },
      } as any;

      reflector.getAllAndOverride.mockReturnValue(isPublic);

      return {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;
    };

    it('should allow access to public routes', async () => {
      const context = createMockContext(undefined, true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtAuthService.extractTokenFromHeader).not.toHaveBeenCalled();
    });

    it('should allow access with valid token', async () => {
      const context = createMockContext('Bearer valid-token', false);
      jwtAuthService.extractTokenFromHeader.mockReturnValue('valid-token');
      jwtAuthService.getUserFromToken.mockResolvedValue(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtAuthService.extractTokenFromHeader).toHaveBeenCalledWith(
        'Bearer valid-token',
      );
      expect(jwtAuthService.getUserFromToken).toHaveBeenCalledWith(
        'valid-token',
      );
      expect(context.switchToHttp().getRequest().user).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      const context = createMockContext(undefined, false);
      jwtAuthService.extractTokenFromHeader.mockReturnValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'No token provided',
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      const context = createMockContext('Bearer invalid-token', false);
      jwtAuthService.extractTokenFromHeader.mockReturnValue('invalid-token');
      jwtAuthService.getUserFromToken.mockRejectedValue(
        new Error('Invalid token'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should handle token without Bearer prefix', async () => {
      const context = createMockContext('token-without-bearer', false);
      jwtAuthService.extractTokenFromHeader.mockReturnValue(
        'token-without-bearer',
      );
      jwtAuthService.getUserFromToken.mockResolvedValue(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtAuthService.extractTokenFromHeader).toHaveBeenCalledWith(
        'token-without-bearer',
      );
    });

    it('should attach user to request object', async () => {
      const context = createMockContext('Bearer valid-token', false);
      jwtAuthService.extractTokenFromHeader.mockReturnValue('valid-token');
      jwtAuthService.getUserFromToken.mockResolvedValue(mockUser);

      await guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(request.user).toEqual(mockUser);
      expect(request.user.tenantId).toBe('tenant-1');
      expect(request.user.email).toBe('test@example.com');
      expect(request.user.name).toBe('Test User');
    });
  });
});
