import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';

// Register path aliases for migration CLI
if (require.main !== module) {
  try {
    require('tsconfig-paths/register');
  } catch (e) {
    // tsconfig-paths not available, use relative imports
  }
}

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'haystack',
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? {
          rejectUnauthorized:
            process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
        }
      : false,
  // Scan for entities using path patterns - works in both dev and production
  entities: [
    path.resolve(__dirname, 'entities', '*.entity.{ts,js}'),
    path.resolve(
      __dirname,
      '..',
      'modules',
      '**',
      'entities',
      '*.entity.{ts,js}',
    ),
  ],
  migrations: [path.resolve(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: process.env.DATABASE_LOGGING === 'true',
});
