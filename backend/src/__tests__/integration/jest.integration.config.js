module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../../..',
  roots: ['<rootDir>/src/__tests__/integration'],
  testMatch: ['**/*.integration.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/__tests__/**',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 30000, // Longer timeout for integration tests
  maxWorkers: 1, // Run integration tests sequentially to avoid database conflicts
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
};