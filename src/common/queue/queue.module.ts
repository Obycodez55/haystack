import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueConfig } from '@config/queue.config';
import { QueueService } from './queue.service';

/**
 * Global Queue Module
 * Sets up BullMQ with Redis connection for background job processing
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Job cleanup (completed/failed jobs)
 * - Redis connection using existing Redis config
 * - Global module for use across all modules
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const queueConfig = configService.get<QueueConfig>('queue');

        if (!queueConfig) {
          throw new Error('Queue configuration is missing');
        }

        return {
          connection: {
            host: queueConfig.redis.host,
            port: queueConfig.redis.port,
            password: queueConfig.redis.password,
            db: queueConfig.redis.db,
            // Use same Redis instance as caching/rate limiting
            // BullMQ will create its own connection
          },
          defaultJobOptions: {
            attempts: queueConfig.defaultJobOptions.attempts,
            backoff: {
              type: queueConfig.defaultJobOptions.backoff.type,
              delay: queueConfig.defaultJobOptions.backoff.delay,
            },
            removeOnComplete: {
              age: queueConfig.defaultJobOptions.removeOnComplete.age,
              count: queueConfig.defaultJobOptions.removeOnComplete.count,
            },
            removeOnFail: {
              age: queueConfig.defaultJobOptions.removeOnFail.age,
            },
          },
        };
      },
    }),
  ],
  providers: [QueueService],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
