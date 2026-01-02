import { Provider } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { Repository, ObjectLiteral } from 'typeorm';
import { Queue } from 'bullmq';

/**
 * Create a mock TypeORM repository
 * Returns an empty object that satisfies the Repository interface
 * Methods will be no-ops during OpenAPI generation
 */
function createMockRepository<T extends ObjectLiteral>(): Repository<T> {
  return {
    find: () => Promise.resolve([]),
    findOne: () => Promise.resolve(null),
    findOneBy: () => Promise.resolve(null),
    save: (entity: any) => Promise.resolve(entity),
    update: () => Promise.resolve({ affected: 0 } as any),
    delete: () => Promise.resolve({ affected: 0 } as any),
    remove: () => Promise.resolve({} as any),
    create: (entity?: any) => entity || ({} as any),
    count: () => Promise.resolve(0),
    exists: () => Promise.resolve(false),
    // Add other common repository methods as needed
  } as any;
}

/**
 * Create a mock Bull queue
 * Returns an empty object that satisfies the Queue interface
 * Methods will be no-ops during OpenAPI generation
 */
function createMockQueue<T>(): Queue<T> {
  return {
    add: () => Promise.resolve({ id: 'mock-job-id' } as any),
    getWaitingCount: () => Promise.resolve(0),
    getActiveCount: () => Promise.resolve(0),
    getCompletedCount: () => Promise.resolve(0),
    getFailedCount: () => Promise.resolve(0),
    getDelayedCount: () => Promise.resolve(0),
    pause: () => Promise.resolve(),
    resume: () => Promise.resolve(),
    close: () => Promise.resolve(),
    // Add other common queue methods as needed
  } as any;
}

/**
 * Factory to create mock repository provider for any entity
 */
export function createMockRepositoryProvider<T extends ObjectLiteral>(
  entity: new () => T,
): Provider {
  return {
    provide: getRepositoryToken(entity),
    useValue: createMockRepository<T>(),
  };
}

/**
 * Factory to create mock queue provider for any queue
 */
export function createMockQueueProvider<T>(queueName: string): Provider {
  return {
    provide: getQueueToken(queueName),
    useValue: createMockQueue<T>(),
  };
}
