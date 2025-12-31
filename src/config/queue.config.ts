import { registerAs } from '@nestjs/config';

export interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  defaultJobOptions: {
    attempts: number;
    backoff: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete: {
      age: number; // seconds
      count: number;
    };
    removeOnFail: {
      age: number; // seconds
    };
  };
  queues: {
    email?: {
      concurrency: number;
    };
    webhook?: {
      concurrency: number;
    };
    'payment-retry'?: {
      concurrency: number;
    };
    reconciliation?: {
      concurrency: number;
    };
  };
}

export default registerAs('queue', (): QueueConfig => {
  // Use test Redis DB if NODE_ENV is test
  const isTest = process.env.NODE_ENV === 'test';
  const defaultDb = isTest ? 1 : 0;

  return {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || String(defaultDb), 10),
    },
    defaultJobOptions: {
      attempts: parseInt(process.env.QUEUE_DEFAULT_ATTEMPTS || '3', 10),
      backoff: {
        type: (process.env.QUEUE_BACKOFF_TYPE || 'exponential') as
          | 'exponential'
          | 'fixed',
        delay: parseInt(process.env.QUEUE_BACKOFF_DELAY || '2000', 10),
      },
      removeOnComplete: {
        age: parseInt(process.env.QUEUE_REMOVE_ON_COMPLETE_AGE || '86400', 10), // 24 hours
        count: parseInt(
          process.env.QUEUE_REMOVE_ON_COMPLETE_COUNT || '1000',
          10,
        ),
      },
      removeOnFail: {
        age: parseInt(process.env.QUEUE_REMOVE_ON_FAIL_AGE || '604800', 10), // 7 days
      },
    },
    queues: {
      email: {
        concurrency: parseInt(process.env.QUEUE_EMAIL_CONCURRENCY || '5', 10),
      },
      webhook: {
        concurrency: parseInt(
          process.env.QUEUE_WEBHOOK_CONCURRENCY || '10',
          10,
        ),
      },
      'payment-retry': {
        concurrency: parseInt(
          process.env.QUEUE_PAYMENT_RETRY_CONCURRENCY || '3',
          10,
        ),
      },
      reconciliation: {
        concurrency: parseInt(
          process.env.QUEUE_RECONCILIATION_CONCURRENCY || '2',
          10,
        ),
      },
    },
  };
});
