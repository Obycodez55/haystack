import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { DatabaseService } from '@database/database.service';
import { RedisService } from '@redis/redis.service';

@Injectable()
export class HealthService extends HealthIndicator {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  /**
   * Check if API service is healthy
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = true; // Basic check - service is running
    const result = this.getStatus(key, isHealthy, {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  /**
   * Check database health
   */
  async isDatabaseHealthy(): Promise<HealthIndicatorResult> {
    try {
      const health = await this.databaseService.checkHealth();
      const stats = await this.databaseService.getConnectionStats();

      return this.getStatus('database', health.status === 'up', {
        status: health.status,
        responseTime: health.responseTime,
        connectionPool: stats,
        error: health.error,
      });
    } catch (error) {
      return this.getStatus('database', false, {
        error: error.message,
      });
    }
  }

  /**
   * Check Redis health
   */
  async isRedisHealthy(): Promise<HealthIndicatorResult> {
    try {
      const health = await this.redisService.healthCheck();
      const stats = await this.redisService.getStats();

      return this.getStatus('redis', health.status === 'up', {
        status: health.status,
        latency: health.latency,
        stats,
        error: health.error,
      });
    } catch (error) {
      return this.getStatus('redis', false, {
        error: error.message,
      });
    }
  }
}
