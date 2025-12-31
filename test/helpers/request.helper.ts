import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { createMockLogger } from '../mocks';

/**
 * Request testing utilities
 * Provides helpers for creating test apps and making authenticated requests
 */
export class RequestHelper {
  /**
   * Create a NestJS application for testing
   * Optionally override modules or providers
   */
  static async createTestApp(moduleOverrides?: {
    imports?: any[];
    providers?: any[];
    controllers?: any[];
  }): Promise<INestApplication> {
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule, ...(moduleOverrides?.imports || [])],
      providers: [...(moduleOverrides?.providers || [])],
      controllers: [...(moduleOverrides?.controllers || [])],
    });

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    const app = moduleFixture.createNestApplication();

    // Apply global pipes, filters, and interceptors
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    const mockLogger = createMockLogger();
    app.useGlobalFilters(new HttpExceptionFilter(mockLogger as any));
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
    return app;
  }

  /**
   * Create an authenticated request helper
   * Returns a function that makes requests with the API key in Authorization header
   */
  static createAuthenticatedRequest(
    app: INestApplication,
    apiKey: string,
  ): any {
    return request(app.getHttpServer()).set(
      'Authorization',
      `Bearer ${apiKey}`,
    );
  }

  /**
   * Create a request helper with tenant context
   * Sets tenant ID in AsyncLocalStorage for the request
   */
  static createTenantRequest(app: INestApplication, tenantId: string): any {
    // Note: Tenant context is set via middleware, so we need to pass it via headers
    // or use the tenant helper to set context before making requests
    return request(app.getHttpServer()).set('X-Tenant-Id', tenantId);
  }

  /**
   * Make a request with common assertions
   * Wrapper around supertest with default expectations
   */
  static makeRequest(
    app: INestApplication,
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    options?: {
      body?: any;
      headers?: Record<string, string>;
      query?: Record<string, string>;
      expectedStatus?: number;
    },
  ): request.Test {
    let req: request.Test;

    const httpServer = app.getHttpServer();

    switch (method.toLowerCase()) {
      case 'get':
        req = request(httpServer).get(path);
        break;
      case 'post':
        req = request(httpServer).post(path);
        break;
      case 'put':
        req = request(httpServer).put(path);
        break;
      case 'patch':
        req = request(httpServer).patch(path);
        break;
      case 'delete':
        req = request(httpServer).delete(path);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    // Set headers
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        req.set(key, value);
      });
    }

    // Set query parameters
    if (options?.query) {
      req.query(options.query);
    }

    // Set body
    if (options?.body) {
      req.send(options.body);
    }

    // Set expected status if provided
    if (options?.expectedStatus) {
      req.expect(options.expectedStatus);
    }

    return req;
  }

  /**
   * Assert a successful response format
   */
  static expectSuccessResponse(response: request.Response): void {
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('meta');
  }

  /**
   * Assert an error response format
   */
  static expectErrorResponse(response: request.Response, code?: string): void {
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code');
    expect(response.body.error).toHaveProperty('message');
    expect(response.body.error).toHaveProperty('type');

    if (code) {
      expect(response.body.error.code).toBe(code);
    }
  }
}
