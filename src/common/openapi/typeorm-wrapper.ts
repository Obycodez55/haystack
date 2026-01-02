import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { createMockRepositoryProvider } from './openapi-mock.provider';

const isOpenApiGeneration = process.env.GENERATE_OPENAPI === 'true';

/**
 * Mock TypeORM module for OpenAPI generation
 * Provides the same exports as TypeOrmModule but with mocks
 */
@Module({})
class MockTypeOrmModule {}

/**
 * Wrapper around TypeOrmModule.forFeature that automatically provides mocks during OpenAPI generation.
 *
 * Modules can use this instead of TypeOrmModule.forFeature directly.
 * During OpenAPI generation, it provides mock repositories.
 * During normal operation, it uses the real TypeORM module.
 *
 * @param entities - Array of entity classes to register
 * @returns DynamicModule that provides either real or mock repositories
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     TypeOrmFeatureModule([TenantEntity]), // No conditional logic needed!
 *   ],
 * })
 * ```
 */
export function TypeOrmFeatureModule(
  entities: EntityClassOrSchema[],
): DynamicModule {
  if (isOpenApiGeneration) {
    // During OpenAPI generation, return a module that provides mocks
    // Filter to only class constructors (not string names or schemas)
    const entityClasses = entities.filter(
      (entity): entity is new () => any => typeof entity === 'function',
    );
    const mockProviders = entityClasses.map((entity) =>
      createMockRepositoryProvider(entity),
    );
    return {
      module: MockTypeOrmModule,
      providers: mockProviders,
      exports: [...mockProviders, MockTypeOrmModule],
    };
  }
  // Normal operation - use real TypeORM
  return TypeOrmModule.forFeature(entities);
}
