import { execSync } from 'child_process';
import * as path from 'path';

// Register tsconfig-paths before importing anything
require('tsconfig-paths/register');

const migrationName = process.argv[2];

if (!migrationName) {
  console.error('Usage: pnpm migration:generate <MigrationName>');
  console.error('Example: pnpm migration:generate AddEmailVerifiedAtToTenants');
  process.exit(1);
}

// If user provided full path, extract just the name
const nameOnly = migrationName.split('/').pop() || migrationName;
const migrationPath = path.join(
  __dirname,
  '../src/database/migrations',
  nameOnly,
);
const dataSourcePath = path.join(
  __dirname,
  '../src/database/data-source.migration.ts',
);

console.log(`Generating migration: ${nameOnly}`);
console.log(`Migration will be created at: ${migrationPath}`);

try {
  // Use typeorm-ts-node-commonjs which handles TypeScript and path resolution
  execSync(
    `typeorm-ts-node-commonjs migration:generate -d ${dataSourcePath} ${migrationPath}`,
    {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        TS_NODE_PROJECT: path.join(__dirname, '../tsconfig.json'),
        TS_NODE_TRANSPILE_ONLY: 'true',
        NODE_OPTIONS: '--require tsconfig-paths/register',
      },
    },
  );
} catch (error) {
  console.error('Error during migration generation:');
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}
