import pino from 'pino';
import { LogLevel } from '../types/log-entry.types';

export interface LoggerConfig {
  service: string;
  environment: string;
  logLevel: LogLevel;
  enablePrettyPrint: boolean;
  enableFileLogging: boolean;
  logDir?: string;
}

/**
 * Create Pino logger instance with appropriate configuration
 */
export class LoggerConfigFactory {
  static create(config: LoggerConfig): pino.Logger {
    const isDevelopment = config.environment === 'development';
    const isProduction = config.environment === 'production';

    // Base logger options
    const loggerOptions: pino.LoggerOptions = {
      level: config.logLevel,
      base: {
        service: config.service,
        environment: config.environment,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => {
          return { level: label.toUpperCase() };
        },
      },
    };

    // Development: Pretty print for readability
    if (isDevelopment && config.enablePrettyPrint) {
      loggerOptions.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
          singleLine: false,
          hideObject: false,
        },
      };
    }

    // Production: JSON format for log aggregation
    if (isProduction) {
      loggerOptions.formatters = {
        ...loggerOptions.formatters,
        log: (object) => {
          // Ensure structured format for CloudWatch/Elasticsearch
          return {
            ...object,
            '@timestamp': new Date().toISOString(),
          };
        },
      };
    }

    // Create logger
    const logger = pino(loggerOptions);

    // Note: File logging with Pino requires pino-multi-stream or pino-roll
    // For now, we'll use console transport only
    // File logging can be added later with proper stream handling
    // For production, consider using pino-roll for log rotation

    return logger;
  }
}
