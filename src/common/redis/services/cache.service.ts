import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis.service';
import { LoggerService } from '@common';
import { CacheOptions } from '../interfaces/cache.interface';
import { buildCacheKey } from '../utils/key-builder.util';
import { RedisConfig } from '@config';

@Injectable()
export class CacheService {
  constructor(
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('CacheService');
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, namespace?: string): Promise<T | null> {
    const fullKey = buildCacheKey(key, namespace);

    try {
      const value = await this.redis.client.get(fullKey);
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Cache get failed', errorObj, {
        key: fullKey,
      });
      return null; // Fail gracefully
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions,
  ): Promise<boolean> {
    const fullKey = buildCacheKey(key, options?.namespace);
    const ttl = options?.ttl || this.getDefaultTtl(options?.namespace);
    const serialized = JSON.stringify(value);

    try {
      if (ttl > 0) {
        await this.redis.client.setex(fullKey, ttl, serialized);
      } else {
        await this.redis.client.set(fullKey, serialized);
      }

      // Store tags if provided
      if (options?.tags && options.tags.length > 0) {
        await this.setWithTags(fullKey, options.tags, ttl);
      }

      return true;
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Cache set failed', errorObj, {
        key: fullKey,
      });
      return false; // Fail gracefully
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, namespace?: string): Promise<boolean> {
    const fullKey = buildCacheKey(key, namespace);

    try {
      await this.redis.client.del(fullKey);
      return true;
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Cache delete failed', errorObj, {
        key: fullKey,
      });
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async deletePattern(pattern: string, namespace?: string): Promise<number> {
    const fullPattern = buildCacheKey(pattern, namespace);

    try {
      const keys = await this.redis.client.keys(fullPattern);
      if (keys.length === 0) {
        return 0;
      }

      await this.redis.client.del(...keys);
      return keys.length;
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Cache delete pattern failed', errorObj, {
        pattern: fullPattern,
      });
      return 0;
    }
  }

  /**
   * Get or set value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key, options?.namespace);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const value = await fetcher();

    // Cache result
    await this.set(key, value, options);

    return value;
  }

  /**
   * Get or set with lock (prevents cache stampede)
   */
  async getOrSetWithLock<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key, options?.namespace);
    if (cached !== null) {
      return cached;
    }

    // Acquire lock
    const lockKey = `lock:${buildCacheKey(key, options?.namespace)}`;
    const lockAcquired = await this.acquireLock(lockKey, 10); // 10 second lock

    if (!lockAcquired) {
      // Another request is fetching, wait and retry
      await this.sleep(100);
      return this.getOrSetWithLock(key, fetcher, options);
    }

    try {
      // Double-check cache (another request might have populated it)
      const cachedAgain = await this.get<T>(key, options?.namespace);
      if (cachedAgain !== null) {
        return cachedAgain;
      }

      // Fetch data
      const value = await fetcher();

      // Cache result
      await this.set(key, value, options);

      return value;
    } finally {
      // Release lock
      await this.releaseLock(lockKey);
    }
  }

  /**
   * Write-through caching (update cache immediately when data changes)
   */
  async writeThrough<T>(
    key: string,
    updater: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    // Update source
    const updated = await updater();

    // Update cache immediately
    await this.set(key, updated, options);

    return updated;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string, namespace?: string): Promise<number> {
    return this.deletePattern(pattern, namespace);
  }

  /**
   * Invalidate cache by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    try {
      // Get all keys with this tag
      const keys = await this.redis.client.smembers(`tag:${tag}`);

      if (keys.length === 0) {
        return 0;
      }

      // Delete all keys
      await this.redis.client.del(...keys);

      // Delete tag set
      await this.redis.client.del(`tag:${tag}`);

      return keys.length;
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Cache invalidate by tag failed', errorObj, {
        tag,
      });
      return 0;
    }
  }

  /**
   * Set cache with tags
   */
  private async setWithTags(
    key: string,
    tags: string[],
    ttl: number,
  ): Promise<void> {
    try {
      for (const tag of tags) {
        await this.redis.client.sadd(`tag:${tag}`, key);
        await this.redis.client.expire(`tag:${tag}`, ttl);
      }
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to set cache tags', errorObj, {
        key,
        tags,
      });
    }
  }

  /**
   * Acquire distributed lock
   */
  private async acquireLock(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.redis.client.set(
        key,
        'locked',
        'EX',
        ttl,
        'NX', // Only set if not exists
      );
      return result === 'OK';
    } catch (error) {
      return false;
    }
  }

  /**
   * Release distributed lock
   */
  private async releaseLock(key: string): Promise<void> {
    try {
      await this.redis.client.del(key);
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to release lock', errorObj, {
        key,
      });
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get default TTL for namespace
   */
  private getDefaultTtl(namespace?: string): number {
    const config = this.configService.get<RedisConfig>('redis');
    const cacheTtl = config?.cacheTtl;

    switch (namespace) {
      case 'payment':
        return cacheTtl?.payment || 300; // 5 minutes
      case 'provider':
        return cacheTtl?.provider || 60; // 1 minute
      case 'tenant':
        return cacheTtl?.tenant || 900; // 15 minutes
      default:
        return config?.defaultTtl || 3600; // 1 hour
    }
  }
}
