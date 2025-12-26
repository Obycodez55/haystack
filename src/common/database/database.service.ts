import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LoggerService } from '../logging/services/logger.service';

export interface ConnectionStats {
  total: number;
  idle: number;
  waiting: number;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly dataSource: DataSource | null;

  constructor(
    @InjectDataSource({ optional: true }) dataSource: DataSource | null,
    private readonly logger: LoggerService,
  ) {
    this.dataSource = dataSource;
    this.logger.setContext('DatabaseService');
  }

  async onModuleInit() {
    // Skip database connection during OpenAPI generation or if no data source
    if (process.env.GENERATE_OPENAPI === 'true' || !this.dataSource) {
      this.logger.warn('Database connection skipped (OpenAPI generation mode)');
      return;
    }

    try {
      // Test connection
      await this.dataSource.query('SELECT 1');
      this.logger.log('Database connection established');
    } catch (error) {
      this.logger.error(
        'Failed to connect to database',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Health check for database
   */
  async checkHealth(): Promise<{
    status: string;
    responseTime?: number;
    error?: string;
  }> {
    if (!this.dataSource) {
      return {
        status: 'down',
        error: 'Database not available (OpenAPI generation mode)',
      };
    }

    try {
      const startTime = Date.now();
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        responseTime,
      };
    } catch (error) {
      this.logger.error(
        'Database health check failed',
        error instanceof Error ? error : new Error(String(error)),
        { error: error instanceof Error ? error.message : String(error) },
      );
      return {
        status: 'down',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get connection pool statistics
   */
  async getConnectionStats(): Promise<ConnectionStats> {
    try {
      // TypeORM uses pg-pool internally, but we can't access it directly
      // This is a placeholder - actual implementation depends on TypeORM version
      const pool = (this.dataSource.driver as any).master?.pool;

      if (pool) {
        return {
          total: pool.totalCount || 0,
          idle: pool.idleCount || 0,
          waiting: pool.waitingCount || 0,
        };
      }

      return {
        total: 0,
        idle: 0,
        waiting: 0,
      };
    } catch (error) {
      this.logger.error(
        'Failed to get connection stats',
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        total: 0,
        idle: 0,
        waiting: 0,
      };
    }
  }

  /**
   * Get data source instance
   */
  getDataSource(): DataSource | null {
    return this.dataSource;
  }

  /**
   * Cleanup on module destroy
   * Ensures all database connections are properly closed
   */
  async onModuleDestroy() {
    if (!this.dataSource) {
      return;
    }

    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
        this.logger.log('Database connections closed');
      }
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Error closing database connections', errorObj);
    }
  }
}
