import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node', // Assuming node environment for now, can be changed later if needed for UI tests
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.jest.json',
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^.+\\.module\\.(css|scss)$': '<rootDir>/__mocks__/styleMock.js',
    '^.+\\.(css|scss)$': '<rootDir>/__mocks__/styleMock.js',
  },
};

export default config;
