// Common module exports
export * from './common.module';

// Error exports
export * from './errors';

// Response exports
export * from './responses';

// Filter exports
export * from './filters';

// Interceptor exports
export * from './interceptors';

// Health exports
export * from './health';

// Guard exports (currently empty - NestJS handles versioning automatically)
// export * from './guards';

// Pipe exports
export * from './pipes';

// Utils exports
export * from './utils';

// Note: Database, Redis, Queue, and Logging modules have been moved to src/
// Import them directly: @database, @redis, @queue, @logging

// Re-export CorrelationMiddleware for convenience
export { CorrelationMiddleware } from '@logging/middleware/correlation.middleware';
