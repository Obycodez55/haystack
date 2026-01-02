import { DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { createMockQueueProvider } from './openapi-mock.provider';

const isOpenApiGeneration = process.env.GENERATE_OPENAPI === 'true';

/**
 * Wrapper around BullModule.registerQueue that automatically provides mocks during OpenAPI generation.
 *
 * Modules can use this instead of BullModule.registerQueue directly.
 * During OpenAPI generation, it provides mock queues.
 * During normal operation, it uses the real Bull module.
 *
 * @param queueName - Name of the queue to register
 * @returns DynamicModule that provides either real or mock queue
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     BullQueueModule<EmailJobData>('email'), // No conditional logic needed!
 *   ],
 * })
 * ```
 */
export function BullQueueModule<T = any>(queueName: string): DynamicModule {
  if (isOpenApiGeneration) {
    // During OpenAPI generation, return a module that provides mock queue
    return {
      module: class {},
      providers: [createMockQueueProvider<T>(queueName)],
      exports: [createMockQueueProvider<T>(queueName)],
    };
  }
  // Normal operation - use real Bull
  return BullModule.registerQueue({ name: queueName });
}
