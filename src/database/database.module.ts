import { Global, Module } from '@nestjs/common';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseConfig } from '@config';
import { DatabaseService } from './database.service';
import * as path from 'path';

// For OpenAPI generation, create a minimal module without TypeORM
// This prevents database connection attempts during spec generation
const isOpenApiGeneration = process.env.GENERATE_OPENAPI === 'true';

@Global()
@Module({
  imports: isOpenApiGeneration
    ? [] // No TypeORM during OpenAPI generation
    : [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const dbConfig = configService.get<DatabaseConfig>('database');

            if (!dbConfig) {
              throw new Error('Database configuration is missing');
            }

            return {
              type: 'postgres',
              url: dbConfig.url || undefined,
              host: dbConfig.host,
              port: dbConfig.port,
              username: dbConfig.username,
              password: dbConfig.password,
              database: dbConfig.database,
              ssl: dbConfig.ssl,
              // Scan for entities in both common and modules directories
              // Use absolute paths for TypeORM to correctly resolve glob patterns
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
              migrationsRun: false, // Run migrations manually or via script
              synchronize: dbConfig.synchronize, // NEVER true in production
              logging: dbConfig.logging,
              extra: {
                max: dbConfig.maxConnections,
                min: dbConfig.minConnections,
                idleTimeoutMillis: dbConfig.idleTimeout,
                connectionTimeoutMillis: dbConfig.connectionTimeout,
                statement_timeout: dbConfig.statementTimeout,
                query_timeout: dbConfig.queryTimeout,
                acquireTimeoutMillis: dbConfig.acquireTimeout,
              },
            };
          },
        }),
      ],
  providers: [
    DatabaseService,
    // During OpenAPI generation, provide a null DataSource using the correct token
    ...(isOpenApiGeneration
      ? [
          {
            provide: getDataSourceToken(),
            useValue: null,
          },
        ]
      : []),
  ],
  exports: [DatabaseService, ...(isOpenApiGeneration ? [] : [TypeOrmModule])],
})
export class DatabaseModule {}
