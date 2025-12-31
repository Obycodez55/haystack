// Register path aliases first
require('tsconfig-paths/register');
require('reflect-metadata');

import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

// Import entities using relative paths to avoid alias issues
import {
  BaseEntity,
  TenantScopedEntity,
} from '../src/database/entities/base.entity';
import { TenantEntity } from '../src/modules/tenant/entities/tenant.entity';
import { ApiKeyEntity } from '../src/modules/auth/entities/api-key.entity';

async function runMigrations() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'haystack',
    entities: [BaseEntity, TenantScopedEntity, TenantEntity, ApiKeyEntity],
    migrations: [],
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('✓ Database connected');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    // Check if migrations table exists
    const migrationsTableExists = await queryRunner.hasTable('migrations');
    if (!migrationsTableExists) {
      await queryRunner.query(`
        CREATE TABLE "migrations" (
          "id" SERIAL PRIMARY KEY,
          "timestamp" BIGINT NOT NULL,
          "name" VARCHAR(255) NOT NULL
        )
      `);
      console.log('✓ Created migrations table');
    }

    // Get already run migrations
    const runMigrations = await queryRunner.query(`
      SELECT name FROM migrations ORDER BY timestamp
    `);
    const runMigrationNames = new Set(runMigrations.map((m: any) => m.name));

    // Find all migration files
    const migrationsDir = path.join(__dirname, '../src/database/migrations');
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.ts') && f.match(/^\d+-.+\.ts$/))
      .sort();

    console.log(`Found ${migrationFiles.length} migration files`);

    for (const file of migrationFiles) {
      const match = file.match(/^(\d+)-(.+)\.ts$/);
      if (!match) continue;

      const [, timestamp, name] = match;
      const migrationName = `${name}${timestamp}`;

      if (runMigrationNames.has(migrationName)) {
        console.log(`⏭ Skipping already run migration: ${file}`);
        continue;
      }

      console.log(`\n🔄 Running migration: ${file}`);

      try {
        // Dynamically import the migration
        const migrationPath = path.join(migrationsDir, file);
        delete require.cache[require.resolve(migrationPath)];
        const migrationModule = require(migrationPath);
        const MigrationClass =
          migrationModule.default ||
          migrationModule[migrationName] ||
          (Object.values(migrationModule)[0] as any);

        if (!MigrationClass) {
          throw new Error(`Could not find migration class in ${file}`);
        }

        const migration = new MigrationClass();

        if (migration.up) {
          await migration.up(queryRunner);

          // Record migration
          await queryRunner.query(
            `
            INSERT INTO migrations (timestamp, name) VALUES ($1, $2)
          `,
            [parseInt(timestamp), migrationName],
          );

          console.log(`✓ Completed: ${file}`);
        } else {
          console.log(`⚠ Skipping ${file} - no up() method`);
        }
      } catch (error: any) {
        console.error(`✗ Error running ${file}:`, error.message);
        throw error;
      }
    }

    await queryRunner.release();
    await dataSource.destroy();
    console.log('\n✅ All migrations completed successfully!');
  } catch (error: any) {
    console.error('✗ Migration failed:', error.message);
    await dataSource.destroy();
    process.exit(1);
  }
}

runMigrations().catch(console.error);
