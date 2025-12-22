import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  url: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  maxConnections: number;
  connectionTimeout: number;
}

export default registerAs('database', (): DatabaseConfig => ({
  url: process.env.DATABASE_URL || '',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'haystack',
  ssl: process.env.DATABASE_SSL === 'true',
  maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
  connectionTimeout: parseInt(
    process.env.DATABASE_CONNECTION_TIMEOUT || '30000',
    10,
  ),
}));

