import { DataSource, QueryRunner } from 'typeorm';
import { createDataSource } from './test-database';

let testDataSource: DataSource | null = null;
let queryRunner: QueryRunner | null = null;

/**
 * Database testing utilities
 * Provides helpers for managing test database connections and transactions
 */
export class DatabaseHelper {
  /**
   * Initialize test database connection
   * Should be called in global setup or before tests
   */
  static async setupTestDatabase(): Promise<DataSource> {
    if (testDataSource?.isInitialized) {
      return testDataSource;
    }

    testDataSource = await createDataSource();
    await testDataSource.initialize();
    queryRunner = testDataSource.createQueryRunner();

    return testDataSource;
  }

  /**
   * Get the test DataSource instance
   */
  static getTestDataSource(): DataSource {
    if (!testDataSource || !testDataSource.isInitialized) {
      throw new Error(
        'Test database not initialized. Call setupTestDatabase() first.',
      );
    }
    return testDataSource;
  }

  /**
   * Get the query runner for transaction management
   */
  static getQueryRunner(): QueryRunner {
    if (!queryRunner) {
      throw new Error(
        'Query runner not available. Call setupTestDatabase() first.',
      );
    }
    return queryRunner;
  }

  /**
   * Run a test function within a transaction that is automatically rolled back
   * This provides isolation between tests without needing cleanup
   */
  static async runInTransaction<T>(
    testFn: (queryRunner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    const runner = this.getQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      const result = await testFn(runner);
      await runner.rollbackTransaction();
      return result;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  /**
   * Clear all data from the database (truncate all tables)
   * Useful for E2E tests where you need a clean slate
   */
  static async clearDatabase(): Promise<void> {
    const dataSource = this.getTestDataSource();
    const entities = dataSource.entityMetadatas;

    // Disable foreign key checks temporarily
    await dataSource.query('SET session_replication_role = replica;');

    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
    }

    // Re-enable foreign key checks
    await dataSource.query('SET session_replication_role = DEFAULT;');
  }

  /**
   * Seed test data into the database
   * Accepts a function that receives the DataSource for creating entities
   */
  static async seedTestData(
    seedFn: (dataSource: DataSource) => Promise<void>,
  ): Promise<void> {
    const dataSource = this.getTestDataSource();
    await seedFn(dataSource);
  }

  /**
   * Wait for database to be ready (useful for Docker)
   * Retries connection until successful or timeout
   */
  static async waitForDatabase(
    maxRetries: number = 30,
    retryDelay: number = 1000,
  ): Promise<void> {
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const dataSource = await createDataSource();
        await dataSource.initialize();
        await dataSource.query('SELECT 1');
        await dataSource.destroy();
        return;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw new Error(
            `Database not ready after ${maxRetries} retries: ${error}`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Close test database connection and cleanup
   * Should be called in global teardown or after tests
   */
  static async teardownTestDatabase(): Promise<void> {
    if (queryRunner) {
      await queryRunner.release();
      queryRunner = null;
    }

    if (testDataSource?.isInitialized) {
      await testDataSource.destroy();
      testDataSource = null;
    }
  }

  /**
   * Reset the database helper state
   * Useful for cleanup between test suites
   */
  static reset(): void {
    testDataSource = null;
    queryRunner = null;
  }
}
