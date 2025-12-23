import { execSync } from 'child_process';
import * as path from 'path';

// Register tsconfig-paths before importing anything
require('tsconfig-paths/register');

const migrationName = process.argv[2];

if (!migrationName) {
  console.error('Usage: ts-node scripts/migration-generate.ts <MigrationName>');
  process.exit(1);
}

const migrationPath = path.join(__dirname, '../src/database/migrations', migrationName);
const dataSourcePath = path.join(__dirname, '../src/database/data-source.migration.ts');

try {
  execSync(
    `typeorm-ts-node-commonjs migration:generate -d ${dataSourcePath} ${migrationPath}`,
    {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        TS_NODE_PROJECT: path.join(__dirname, '../tsconfig.json'),
      },
    }
  );
} catch (error) {
  process.exit(1);
}

