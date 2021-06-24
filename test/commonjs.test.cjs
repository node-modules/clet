const assert = require('assert');

// FIXME: not work --- "testMatch": ["**/test/*.test.{js,ts,cjs}"]
describe('test/commonjs.test.cjs', () => {
  let runner;
  beforeAll(async () => {
    runner = (await import('../lib/runner')).default;
  });

  it('should support commonjs', async () => {
    assert(runner);
    console.log('this is commonjs');
    await runner()
      .spawn('npm -v')
      .log('result.stdout')
      .stdout(/\d+\.\d+\.\d+/)
      .end();
  });
});
