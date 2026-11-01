/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(t|j)sx?$': ['babel-jest', {
      presets: [
        ['babel-preset-expo', { unstable_transformImportMeta: true }]
      ],
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo|@expo|@unimodules|sentry-expo|native-base|@rork-ai|@nkzw)'
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'clover'],
  collectCoverageFrom: [
    'services/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'backend/**/*.ts',
    'lib/**/*.ts',
    'config/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/__tests__/**',
    '!**/e2e/**',
    '!**/mocks/**',
    '!**/__mocks__/**',
  ],
  // Coverage thresholds raised from the original 5% baseline to
  // meaningful production gates. The plan is to keep raising these
  // incrementally as new tests are added. The current targets still
  // admit reasonable error so a single untested file won't fail CI
  // for an unrelated reason.
  coverageThreshold: {
    global: {
      branches: 32,
      functions: 37,
      lines: 41,
      statements: 40,
    },
    // Per-file thresholds for security-sensitive code must be high.
    './services/auth-service.ts': {
      branches: 55,
      functions: 70,
      lines: 70,
      statements: 69,
    },
    './services/wallet.ts': {
      branches: 50,
      functions: 50,
      lines: 60,
      statements: 59,
    },
    './services/rate-limiter.ts': {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './utils/secure-random.ts': {
      branches: 75,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
