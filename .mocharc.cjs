process.env.TS_NODE_PROJECT = 'test/tsconfig.json';

module.exports = {
  spec: 'test/**/*.test.ts',
  extension: 'ts',
  require: 'ts-node/register',
  timeout: 120000,
  exclude: 'test/fixtures/',
};
