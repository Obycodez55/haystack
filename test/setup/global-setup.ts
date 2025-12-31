// Register path aliases before any imports
import 'tsconfig-paths/register';

import { DataSource } from 'typeorm';
import { DatabaseHelper } from '../helpers/database.helper';
import { RedisHelper } from '../helpers/redis.helper';
import { TenantFactory, ApiKeyFactory } from '../factories';

/**
 * Global setup for Jest tests
 * Runs once before all tests
 */
export default async function globalSetup(): Promise<void> {
  console.log('Setting up test environment...');

  // Set NODE_ENV to test if not already set
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }

  // Wait for database to be ready (useful for Docker)
  if (process.env.WAIT_FOR_DB === 'true') {
    console.log('Waiting for database to be ready...');
    await DatabaseHelper.waitForDatabase();
  }

  // Wait for Redis to be ready (useful for Docker)
  if (process.env.WAIT_FOR_REDIS === 'true') {
    console.log('Waiting for Redis to be ready...');
    await RedisHelper.waitForRedis();
  }

  // Initialize test database
  console.log('Initializing test database...');

  // Create test database if it doesn't exist
  const adminDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: 'postgres', // Connect to default database
  });

  try {
    await adminDataSource.initialize();
    const testDbName = process.env.DATABASE_NAME || 'haystack_test';
    const dbExists = await adminDataSource.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [testDbName],
    );

    if (dbExists.length === 0) {
      console.log(`Creating test database: ${testDbName}...`);
      await adminDataSource.query(`CREATE DATABASE "${testDbName}"`);
      console.log(`✓ Test database created`);
    }
    await adminDataSource.destroy();
  } catch (error) {
    console.warn('Database creation check failed (may be expected):', error);
    if (adminDataSource.isInitialized) {
      await adminDataSource.destroy();
    }
  }

  const dataSource = await DatabaseHelper.setupTestDatabase();

  // Run migrations
  console.log('Running migrations...');
  try {
    const migrations = await dataSource.runMigrations();
    console.log(`✓ Ran ${migrations.length} migrations`);
  } catch (error) {
    console.warn('Migration error (may be expected if already run):', error);
  }

  // Set DataSource for factories
  TenantFactory.setDataSource(dataSource);
  ApiKeyFactory.setDataSource(dataSource);

  // Initialize test Redis
  console.log('Initializing test Redis...');
  try {
    await RedisHelper.setupTestRedis();
    console.log('✓ Test Redis initialized');
  } catch (error) {
    console.warn('Redis initialization failed (may be expected):', error);
  }

  console.log('✓ Test environment setup complete');
}
