const assert = require('assert');
const path = require('path');

describe('test/commonjs.test.cjs', () => {
  const fixtures = path.resolve('test/fixtures');

  it('should support import', async () => {
    const { runner } = await import('../lib/runner');
    assert(runner);
    console.log('this is commonjs');
  });

  it('should support fork', async () => {
    const { runner } = await import('../lib/runner');
    await runner()
      .fork(`${fixtures}/version.js`)
      .log('result.stdout')
      .stdout(/\d+\.\d+\.\d+/);
  });

  it('should support spawn', async () => {
    const { runner } = await import('../lib/runner');
    await runner()
      .spawn('npm -v')
      .log('result.stdout')
      .stdout(/\d+\.\d+\.\d+/);
  });
});
