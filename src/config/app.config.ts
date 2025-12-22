import { registerAs } from '@nestjs/config';

export interface AppConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  port: number;
  apiVersion: string;
  globalPrefix: string;
}

export default registerAs('app', (): AppConfig => ({
  name: process.env.APP_NAME || 'haystack',
  version: process.env.APP_VERSION || '0.0.1',
  environment: (process.env.NODE_ENV as any) || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  globalPrefix: process.env.GLOBAL_PREFIX || 'api',
}));

