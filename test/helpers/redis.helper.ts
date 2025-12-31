import Redis from 'ioredis';

let testRedisClient: Redis | null = null;
let mockRedis: Map<
  string,
  { value: string; ttl?: number; expiresAt?: number }
> | null = null;

/**
 * Redis testing utilities
 * Provides helpers for managing test Redis connections and mocks
 */
export class RedisHelper {
  /**
   * Initialize test Redis connection
   * Should be called in global setup or before tests
   */
  static async setupTestRedis(): Promise<Redis> {
    if (testRedisClient?.status === 'ready') {
      return testRedisClient;
    }

    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const db = process.env.NODE_ENV === 'test' ? 1 : 0; // Use DB 1 for tests

    testRedisClient = new Redis({
      host,
      port,
      db,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: () => null, // Don't retry in tests
      maxRetriesPerRequest: 1,
      lazyConnect: false,
    });

    await testRedisClient.connect();
    return testRedisClient;
  }

  /**
   * Get the test Redis client instance
   */
  static getTestRedis(): Redis {
    if (!testRedisClient || testRedisClient.status !== 'ready') {
      throw new Error(
        'Test Redis not initialized. Call setupTestRedis() first.',
      );
    }
    return testRedisClient;
  }

  /**
   * Clear all keys from test Redis
   */
  static async clearRedis(): Promise<void> {
    if (testRedisClient?.status === 'ready') {
      await testRedisClient.flushdb();
    }
    if (mockRedis) {
      mockRedis.clear();
    }
  }

  /**
   * Create an in-memory Redis mock for unit tests
   * Returns a mock object that implements common Redis commands
   */
  static createMockRedis(): any {
    mockRedis = new Map();

    const mock: any = {
      get: jest.fn(async (key: string) => {
        const entry = mockRedis!.get(key);
        if (!entry) return null;

        // Check if expired
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          mockRedis!.delete(key);
          return null;
        }

        return entry.value;
      }),

      set: jest.fn(async (key: string, value: string, ...args: any[]) => {
        const entry: { value: string; ttl?: number; expiresAt?: number } = {
          value: String(value),
        };

        // Handle SET key value EX seconds or PX milliseconds
        for (let i = 0; i < args.length; i++) {
          if (args[i] === 'EX' && args[i + 1]) {
            entry.expiresAt = Date.now() + parseInt(args[i + 1], 10) * 1000;
            i++;
          } else if (args[i] === 'PX' && args[i + 1]) {
            entry.expiresAt = Date.now() + parseInt(args[i + 1], 10);
            i++;
          }
        }

        mockRedis!.set(key, entry);
        return 'OK';
      }),

      del: jest.fn(async (...keys: string[]) => {
        let deleted = 0;
        for (const key of keys) {
          if (mockRedis!.delete(key)) {
            deleted++;
          }
        }
        return deleted;
      }),

      exists: jest.fn(async (...keys: string[]) => {
        let count = 0;
        for (const key of keys) {
          const entry = mockRedis!.get(key);
          if (entry) {
            // Check if expired
            if (entry.expiresAt && entry.expiresAt < Date.now()) {
              mockRedis!.delete(key);
            } else {
              count++;
            }
          }
        }
        return count;
      }),

      expire: jest.fn(async (key: string, seconds: number) => {
        const entry = mockRedis!.get(key);
        if (entry) {
          entry.expiresAt = Date.now() + seconds * 1000;
          mockRedis!.set(key, entry);
          return 1;
        }
        return 0;
      }),

      ttl: jest.fn(async (key: string) => {
        const entry = mockRedis!.get(key);
        if (!entry || !entry.expiresAt) return -1;
        const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
        return remaining > 0 ? remaining : -2;
      }),

      keys: jest.fn(async (pattern: string) => {
        const regex = new RegExp(
          pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
        );
        const matchingKeys: string[] = [];
        for (const key of mockRedis!.keys()) {
          if (regex.test(key)) {
            const entry = mockRedis!.get(key);
            // Check if expired
            if (entry?.expiresAt && entry.expiresAt < Date.now()) {
              mockRedis!.delete(key);
            } else {
              matchingKeys.push(key);
            }
          }
        }
        return matchingKeys;
      }),

      flushdb: jest.fn(async () => {
        mockRedis!.clear();
        return 'OK';
      }),

      ping: jest.fn(async () => 'PONG'),

      quit: jest.fn(async () => 'OK'),

      disconnect: jest.fn(() => {
        mockRedis!.clear();
      }),

      status: 'ready',
    };

    return mock;
  }

  /**
   * Wait for Redis to be ready (useful for Docker)
   * Retries connection until successful or timeout
   */
  static async waitForRedis(
    maxRetries: number = 30,
    retryDelay: number = 1000,
  ): Promise<void> {
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const client = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          db: process.env.NODE_ENV === 'test' ? 1 : 0,
          password: process.env.REDIS_PASSWORD,
          retryStrategy: () => null,
          maxRetriesPerRequest: 1,
          lazyConnect: false,
        });

        await client.ping();
        await client.quit();
        return;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw new Error(
            `Redis not ready after ${maxRetries} retries: ${error}`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Close test Redis connection and cleanup
   * Should be called in global teardown or after tests
   */
  static async teardownTestRedis(): Promise<void> {
    if (testRedisClient) {
      await testRedisClient.quit();
      testRedisClient = null;
    }
    if (mockRedis) {
      mockRedis.clear();
      mockRedis = null;
    }
  }

  /**
   * Reset the Redis helper state
   * Useful for cleanup between test suites
   */
  static reset(): void {
    testRedisClient = null;
    mockRedis = null;
  }
}
