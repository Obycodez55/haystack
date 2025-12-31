import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';

// Use relative imports for migration CLI compatibility
import { BaseEntity, TenantScopedEntity } from './entities/base.entity';
import { TenantEntity } from '../modules/tenant/entities/tenant.entity';
import { ApiKeyEntity } from '../modules/auth/entities/api-key.entity';

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
  entities: [BaseEntity, TenantScopedEntity, TenantEntity, ApiKeyEntity],
  migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false,
  logging: process.env.DATABASE_LOGGING === 'true',
});
