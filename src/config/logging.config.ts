import { registerAs } from '@nestjs/config';

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  pretty: boolean;
  fileEnabled: boolean;
  logDir: string;
}

export default registerAs(
  'logging',
  (): LoggingConfig => ({
    level: (process.env.LOG_LEVEL as any) || 'info',
    pretty:
      process.env.LOG_PRETTY === 'true' ||
      process.env.NODE_ENV === 'development',
    fileEnabled: process.env.LOG_FILE_ENABLED === 'true',
    logDir: process.env.LOG_DIR || 'logs',
  }),
);
