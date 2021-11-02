/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  transform: {},
  extensionsToTreatAsEsm: [ '.ts' ],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
  testTimeout: 5000,
  globalSetup: './test/jest-global-setup.ts',
  setupFilesAfterEnv: [
    '<rootDir>/node_modules/common-jest-preset/setup-jest.js',
  ],
};
