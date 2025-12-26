import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseConfig } from '@config';
import { DatabaseService } from './database.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get<DatabaseConfig>('database');

        if (!dbConfig) {
          throw new Error('Database configuration is missing');
        }

        // For OpenAPI generation, use a mock/in-memory database configuration
        // This prevents TypeORM from attempting to connect to a real database
        if (process.env.GENERATE_OPENAPI === 'true') {
          return {
            type: 'sqlite',
            database: ':memory:',
            entities: [
              __dirname + '/entities/*.entity{.ts,.js}',
              __dirname + '/../../modules/**/entities/*.entity{.ts,.js}',
            ],
            synchronize: false,
            logging: false,
            dropSchema: false,
            // Don't initialize the connection
            autoLoadEntities: false,
          };
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
          entities: [
            __dirname + '/entities/*.entity{.ts,.js}',
            __dirname + '/../../modules/**/entities/*.entity{.ts,.js}',
          ],
          migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],
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
  providers: [DatabaseService],
  exports: [DatabaseService, TypeOrmModule],
})
export class DatabaseModule {}
