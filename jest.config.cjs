module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/database/'],
};
