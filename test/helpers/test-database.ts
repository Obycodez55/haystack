import { DataSource } from 'typeorm';
import * as path from 'path';

/**
 * Create a DataSource configured for testing
 * Uses test environment variables or defaults
 */
export async function createDataSource(): Promise<DataSource> {
  const isTest = process.env.NODE_ENV === 'test';
  const databaseName =
    process.env.DATABASE_NAME || (isTest ? 'haystack_test' : 'haystack');

  return new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || undefined,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: databaseName,
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? {
            rejectUnauthorized:
              process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
          }
        : false,
    // Entities - scan for all entity files
    entities: [
      path.join(
        __dirname,
        '../../src/common/database/entities/*.entity{.ts,.js}',
      ),
      path.join(__dirname, '../../src/modules/**/entities/*.entity{.ts,.js}'),
    ],
    // Migrations
    migrations: [
      path.join(__dirname, '../../src/database/migrations/*{.ts,.js}'),
    ],
    synchronize: false, // Never use synchronize in tests
    logging: process.env.DATABASE_LOGGING === 'true',
    // Test-specific connection pool settings
    extra: {
      max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
      min: parseInt(process.env.DATABASE_MIN_CONNECTIONS || '2', 10),
      idleTimeoutMillis: parseInt(
        process.env.DATABASE_IDLE_TIMEOUT || '10000',
        10,
      ),
      connectionTimeoutMillis: parseInt(
        process.env.DATABASE_CONNECTION_TIMEOUT || '5000',
        10,
      ),
    },
  });
}
