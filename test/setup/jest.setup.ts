/**
 * Jest setup file
 * Runs before each test file
 * Use this for configuring Jest matchers, global mocks, etc.
 */

// Extend Jest matchers if needed
// Example: jest-extended, jest-dom, etc.

// Set timezone for consistent test results
process.env.TZ = 'UTC';

// Mock console methods in tests to reduce noise (optional)
// Uncomment if you want to suppress console logs in tests
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Increase timeout for E2E tests
jest.setTimeout(30000);

// Global test utilities can be added here if needed
// Note: Global augmentations should be in a separate .d.ts file if needed
