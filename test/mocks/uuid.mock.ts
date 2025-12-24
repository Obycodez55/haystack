/**
 * Mock for uuid package to avoid ESM issues in Jest
 */
export const v4 = jest.fn(() => {
  // Generate a deterministic mock UUID for testing
  return '00000000-0000-4000-8000-000000000000';
});

export const v1 = jest.fn(() => {
  return '00000000-0000-1000-8000-000000000000';
});

export default {
  v4,
  v1,
};
