import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisConfig } from '@config';
import { LoggerService } from '../logging/services/logger.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  public readonly client: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const config = this.configService.get<RedisConfig>('redis');

    if (!config) {
      throw new Error('Redis configuration is missing');
    }

    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      retryStrategy: (times) => {
        const delay = Math.min(times * config.retryDelay, 3000);
        return delay;
      },
      maxRetriesPerRequest: config.maxRetries,
      enableReadyCheck: true,
      lazyConnect:
        process.env.GENERATE_OPENAPI === 'true' ? true : config.lazyConnect,
      keepAlive: config.keepAlive,
      connectTimeout:
        process.env.GENERATE_OPENAPI === 'true' ? 100 : config.connectTimeout,
      commandTimeout: config.commandTimeout,
      keyPrefix: config.keyPrefix,
    });

    // Error handling
    this.client.on('error', (error) => {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Redis connection error', errorObj);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected', {
        host: config.host,
        port: config.port,
      });
    });

    this.client.on('ready', () => {
      this.logger.log('Redis ready');
    });

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      this.logger.log('Redis reconnecting...');
    });
  }

  async onModuleInit() {
    try {
      if (!this.configService.get<RedisConfig>('redis')?.lazyConnect) {
        await this.client.ping();
        this.logger.log('Redis service initialized');
      }
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to initialize Redis', errorObj);
      // Don't throw - allow graceful degradation
    }
  }

  async onModuleDestroy() {
    try {
      // Remove all event listeners to prevent memory leaks
      this.client.removeAllListeners();

      // Close the connection gracefully
      await this.client.quit();
      this.logger.log('Redis connection closed');
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Error closing Redis connection', errorObj);

      // Force disconnect if quit fails
      try {
        this.client.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: string;
    latency?: number;
    error?: string;
  }> {
    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;
      return { status: 'up', latency };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get Redis stats
   */
  async getStats(): Promise<{
    connectedClients?: number;
    usedMemory?: number;
    totalCommandsProcessed?: number;
  }> {
    try {
      const info = await this.client.info('stats');
      const clients = info.match(/connected_clients:(\d+)/)?.[1];
      const memory = info.match(/used_memory:(\d+)/)?.[1];
      const commands = info.match(/total_commands_processed:(\d+)/)?.[1];

      return {
        connectedClients: clients ? parseInt(clients, 10) : undefined,
        usedMemory: memory ? parseInt(memory, 10) : undefined,
        totalCommandsProcessed: commands ? parseInt(commands, 10) : undefined,
      };
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to get Redis stats', errorObj);
      return {};
    }
  }
}
