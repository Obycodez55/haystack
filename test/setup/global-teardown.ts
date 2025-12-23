import { DatabaseHelper } from '../helpers/database.helper';
import { RedisHelper } from '../helpers/redis.helper';

/**
 * Global teardown for Jest tests
 * Runs once after all tests
 */
export default async function globalTeardown(): Promise<void> {
  console.log('Tearing down test environment...');

  // Close Redis connection
  try {
    await RedisHelper.teardownTestRedis();
    console.log('✓ Test Redis closed');
  } catch (error) {
    console.warn('Redis teardown error:', error);
  }

  // Close database connection
  try {
    await DatabaseHelper.teardownTestDatabase();
    console.log('✓ Test database closed');
  } catch (error) {
    console.warn('Database teardown error:', error);
  }

  console.log('✓ Test environment teardown complete');
}
