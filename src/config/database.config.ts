import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  url: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl:
    | boolean
    | { rejectUnauthorized: boolean; ca?: string; cert?: string; key?: string };
  maxConnections: number;
  minConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
  statementTimeout: number;
  queryTimeout: number;
  poolSize: number;
  acquireTimeout: number;
  synchronize: boolean;
  logging: boolean | ('query' | 'error' | 'schema' | 'warn' | 'info' | 'log')[];
  enableQueryLogging: boolean;
}

export default registerAs('database', (): DatabaseConfig => {
  const sslEnv = process.env.DATABASE_SSL;
  let ssl:
    | boolean
    | {
        rejectUnauthorized: boolean;
        ca?: string;
        cert?: string;
        key?: string;
      } = false;

  if (sslEnv === 'true') {
    ssl = {
      rejectUnauthorized:
        process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
      ca: process.env.DATABASE_SSL_CA,
      cert: process.env.DATABASE_SSL_CERT,
      key: process.env.DATABASE_SSL_KEY,
    };
  }

  const loggingEnv = process.env.DATABASE_LOGGING;
  let logging:
    | boolean
    | ('query' | 'error' | 'schema' | 'warn' | 'info' | 'log')[] = false;

  if (loggingEnv === 'true') {
    logging = true;
  } else if (loggingEnv === 'all') {
    logging = ['query', 'error', 'schema', 'warn', 'info', 'log'];
  } else if (loggingEnv) {
    logging = loggingEnv.split(',') as (
      | 'query'
      | 'error'
      | 'schema'
      | 'warn'
      | 'info'
      | 'log'
    )[];
  }

  return {
    url: process.env.DATABASE_URL || '',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'haystack',
    ssl,
    maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20', 10),
    minConnections: parseInt(process.env.DATABASE_MIN_CONNECTIONS || '5', 10),
    idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000', 10),
    connectionTimeout: parseInt(
      process.env.DATABASE_CONNECTION_TIMEOUT || '10000',
      10,
    ),
    statementTimeout: parseInt(
      process.env.DATABASE_STATEMENT_TIMEOUT || '30000',
      10,
    ),
    queryTimeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT || '30000', 10),
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
    acquireTimeout: parseInt(
      process.env.DATABASE_ACQUIRE_TIMEOUT || '60000',
      10,
    ),
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
    logging,
    enableQueryLogging: process.env.DATABASE_ENABLE_QUERY_LOGGING === 'true',
  };
});
