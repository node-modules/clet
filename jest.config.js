import os from 'os';

export default () => {
  // only report to GitHub annotations at 16.x
  const reporters = [ 'default', 'jest-summary-reporter' ];
  if (process.env.CI && os.platform() === 'linux' && process.version.startsWith('v16')) {
    reporters.push('github-actions');
  }

  return {
    preset: 'common-jest-preset',
    transform: {},
    testTimeout: 5000,
    reporters,
    globalSetup: './test/jest-global-setup.js',
    setupFilesAfterEnv: [
      '<rootDir>/node_modules/common-jest-preset/setup-jest.js',
    ],
  };
};
