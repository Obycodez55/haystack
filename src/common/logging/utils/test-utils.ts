import { LoggerService } from '../services/logger.service';

/**
 * Mock logger for testing
 */
export const createMockLogger = (): Partial<LoggerService> => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  setContext: jest.fn(),
  logBusinessEvent: jest.fn(),
  logPerformance: jest.fn(),
  logRequest: jest.fn(),
  logPaymentEvent: jest.fn(),
  logProviderEvent: jest.fn(),
});

/**
 * Test logger that collects logs in memory
 */
export class TestLogger extends LoggerService {
  public logs: any[] = [];

  log(message: string, data?: any) {
    this.logs.push({ level: 'info', message, data });
    super.log(message, data);
  }

  error(message: string, error?: Error | string, data?: any) {
    this.logs.push({ level: 'error', message, error, data });
    super.error(message, error, data);
  }

  warn(message: string, data?: any) {
    this.logs.push({ level: 'warn', message, data });
    super.warn(message, data);
  }

  debug(message: string, data?: any) {
    this.logs.push({ level: 'debug', message, data });
    super.debug(message, data);
  }

  verbose(message: string, data?: any) {
    this.logs.push({ level: 'verbose', message, data });
    super.verbose(message, data);
  }

  clear() {
    this.logs = [];
  }

  getLogsByLevel(level: string) {
    return this.logs.filter((log) => log.level === level);
  }
}
