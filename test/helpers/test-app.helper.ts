import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { RequestHelper } from './request.helper';

/**
 * Test application utilities
 * Provides helpers for creating and configuring test modules
 */
export class TestAppHelper {
  /**
   * Create a testing module with optional overrides
   */
  static createTestModule(
    imports: any[] = [],
    providers: any[] = [],
  ): TestingModuleBuilder {
    return Test.createTestingModule({
      imports: [AppModule, ...imports],
      providers: [...providers],
    });
  }

  /**
   * Override providers in a testing module
   */
  static overrideProviders(
    moduleBuilder: TestingModuleBuilder,
    overrides: Array<{ provide: any; useValue: any }>,
  ): TestingModuleBuilder {
    overrides.forEach((override) => {
      moduleBuilder
        .overrideProvider(override.provide)
        .useValue(override.useValue);
    });
    return moduleBuilder;
  }

  /**
   * Create a full E2E application for testing
   * Includes all modules, middleware, guards, and interceptors
   */
  static async createE2EApp(moduleOverrides?: {
    imports?: any[];
    providers?: any[];
    controllers?: any[];
  }): Promise<INestApplication> {
    return RequestHelper.createTestApp(moduleOverrides);
  }

  /**
   * Create a minimal test application
   * Only includes specified modules
   */
  static async createMinimalApp(
    imports: any[],
    providers: any[] = [],
  ): Promise<INestApplication> {
    const moduleFixture = await Test.createTestingModule({
      imports,
      providers,
    }).compile();

    const app = moduleFixture.createNestApplication();
    await app.init();
    return app;
  }
}
