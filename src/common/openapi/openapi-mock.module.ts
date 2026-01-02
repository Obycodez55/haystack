import { Global, Module } from '@nestjs/common';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import {
  createMockRepositoryProvider,
  createMockQueueProvider,
} from './openapi-mock.provider';

// Import all entities that need mocking
import { TenantEntity } from '@modules/tenant/entities/tenant.entity';
import { ApiKeyEntity } from '@modules/auth/entities/api-key.entity';
import { TwoFactorEntity } from '@modules/auth/entities/two-factor.entity';
import { EmailLogEntity } from '@modules/email/entities/email-log.entity';

// Import queue job data types
import { EmailJobData } from '@modules/email/jobs/email.job.interface';

/**
 * Global OpenAPI Mock Module
 *
 * Provides mocks for all database and queue dependencies during OpenAPI generation.
 * This allows modules to use their normal imports without special handling.
 *
 * Usage:
 * - Import this module conditionally in AppModule when GENERATE_OPENAPI === 'true'
 * - Individual modules can use normal TypeORM and Bull imports
 * - Mocks will automatically satisfy dependency injection requirements
 */
@Global()
@Module({
  providers: [
    // Mock DataSource (ensures it's available globally)
    {
      provide: getDataSourceToken(),
      useValue: null,
    },
    // Mock all TypeORM repositories
    createMockRepositoryProvider(TenantEntity),
    createMockRepositoryProvider(ApiKeyEntity),
    createMockRepositoryProvider(TwoFactorEntity),
    createMockRepositoryProvider(EmailLogEntity),
    // Add more repository mocks as new entities are added
    // Mock all Bull queues
    createMockQueueProvider<EmailJobData>('email'),
    // Add more queue mocks as new queues are added
  ],
})
export class OpenApiMockModule {}
