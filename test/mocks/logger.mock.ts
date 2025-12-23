import { LoggerService } from '@common/logging/services/logger.service';
import { createMockLogger, TestLogger } from '@common/logging/utils/test-utils';

/**
 * Enhanced logger mock for testing
 * Extends the existing test utilities with additional helpers
 */
export class MockLogger extends TestLogger {
  constructor() {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'app') return { name: 'test', environment: 'test' };
        if (key === 'logging')
          return { level: 'error', pretty: false, fileEnabled: false };
        return {};
      }),
    } as any;
    super(mockConfigService);
  }
  /**
   * Get all error logs
   */
  getErrors() {
    return this.getLogsByLevel('error');
  }

  /**
   * Get all warning logs
   */
  getWarnings() {
    return this.getLogsByLevel('warn');
  }

  /**
   * Get all info logs
   */
  getInfoLogs() {
    return this.getLogsByLevel('info');
  }

  /**
   * Check if a specific error message was logged
   */
  hasError(message: string | RegExp): boolean {
    const errors = this.getErrors();
    return errors.some((log) => {
      if (typeof message === 'string') {
        return log.message.includes(message);
      }
      return message.test(log.message);
    });
  }

  /**
   * Get the last error log
   */
  getLastError(): any {
    const errors = this.getErrors();
    return errors.length > 0 ? errors[errors.length - 1] : null;
  }
}

/**
 * Create a mock logger instance
 */
export function createMockLoggerInstance(context?: string): MockLogger {
  const logger = new MockLogger();
  if (context) {
    logger.setContext(context);
  }
  return logger;
}

/**
 * Re-export the existing mock logger creator
 */
export { createMockLogger };
