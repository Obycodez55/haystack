import { execSync } from 'child_process';
import * as path from 'path';

require('tsconfig-paths/register');

const dataSourcePath = path.join(__dirname, '../src/database/data-source.migration.ts');

try {
  execSync(
    `typeorm-ts-node-commonjs migration:run -d ${dataSourcePath}`,
    {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    }
  );
} catch (error) {
  process.exit(1);
}

