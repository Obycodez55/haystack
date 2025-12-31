# Queue Module

Queue infrastructure using BullMQ with NestJS integration for background job processing.

## Overview

This module provides a global queue system using `@nestjs/bullmq` that integrates with our existing Redis instance. It's designed to handle async background jobs like email sending, webhook delivery, payment retries, and reconciliation.

## Features

- ✅ **Global Queue Module**: Available across all modules
- ✅ **Redis Integration**: Uses existing Redis connection
- ✅ **Automatic Retry**: Exponential backoff for failed jobs
- ✅ **Job Cleanup**: Automatic removal of completed/failed jobs
- ✅ **Type-Safe**: Full TypeScript support
- ✅ **Configurable**: Environment-based configuration

## Configuration

Queue configuration is managed via environment variables:

```env
# Queue Default Options
QUEUE_DEFAULT_ATTEMPTS=3
QUEUE_BACKOFF_TYPE=exponential
QUEUE_BACKOFF_DELAY=2000
QUEUE_REMOVE_ON_COMPLETE_AGE=86400  # 24 hours
QUEUE_REMOVE_ON_COMPLETE_COUNT=1000
QUEUE_REMOVE_ON_FAIL_AGE=604800     # 7 days

# Queue Concurrency (per queue)
QUEUE_EMAIL_CONCURRENCY=5
QUEUE_WEBHOOK_CONCURRENCY=10
QUEUE_PAYMENT_RETRY_CONCURRENCY=3
QUEUE_RECONCILIATION_CONCURRENCY=2
```

## Usage

### Registering a Queue

In your module (e.g., `EmailModule`):

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  // ... other providers
})
export class EmailModule {}
```

### Creating a Queue Service

```typescript
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async enqueue(data: any) {
    return this.emailQueue.add('send-email', data, {
      priority: 0,
    });
  }
}
```

### Creating a Job Processor

```typescript
import { Processor, Process } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';

@Processor('email')
@Injectable()
export class EmailProcessor {
  @Process('send-email')
  async handleEmail(job: Job) {
    const { data } = job;
    // Process email
    return { success: true };
  }
}
```

## Queue Configuration

The queue system uses the same Redis instance as caching and rate limiting. Configuration is loaded from `queue.config.ts` and uses the same Redis connection settings.

## Job Options

Default job options (can be overridden per job):

- **Attempts**: 3 retries
- **Backoff**: Exponential (2s, 4s, 8s)
- **Remove on Complete**: After 24 hours or 1000 jobs
- **Remove on Fail**: After 7 days

## Future Queues

The system is designed to support multiple queues:

- `email` - Email sending
- `webhook` - Webhook delivery
- `payment-retry` - Payment retry logic
- `reconciliation` - Daily reconciliation jobs

Each queue can have its own concurrency settings.

## Health Checks

Queue health can be checked via the health service (to be implemented per queue module).

## Notes

- Queues are registered per module, not globally
- Each module that uses queues must register them
- The QueueModule only provides the BullMQ root configuration
- Job processors must be registered in the module that uses the queue
