const assert = require('assert');
const path = require('path');

describe('test/commonjs.test.cjs', () => {
  let runner;
  const fixtures = path.resolve('test/fixtures');

  beforeAll(async () => {
    runner = (await import('../lib/runner')).runner;
    assert(runner);
    console.log('this is commonjs');
  });

  it('should support fork', async () => {
    await runner()
      .fork(`${fixtures}/version.js`)
      .log('result.stdout')
      .stdout(/\d+\.\d+\.\d+/);
  });

  it('should support spawn', async () => {
    await runner()
      .spawn('npm -v')
      .log('result.stdout')
      .stdout(/\d+\.\d+\.\d+/);
  });
});
