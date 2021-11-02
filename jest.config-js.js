/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
export default {
  preset: 'common-jest-preset',
  testPathIgnorePatterns: [ 'test/*.ts' ],
  transform: {},
  testTimeout: 5000,
  globalSetup: './test/jest-global-setup.js',
  setupFilesAfterEnv: [
    '<rootDir>/node_modules/common-jest-preset/setup-jest.js',
  ],
};
