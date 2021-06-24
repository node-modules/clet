import path from 'path';
import runner from '../lib/runner.js';
import * as utils from './test-utils.js';
const { assert } = utils;

describe('test/runner.test.js', () => {
  const fixtures = path.resolve('test/fixtures');
  const tmpDir = utils.getTempDir();

  beforeEach(() => utils.initDir(tmpDir));

  it('should work', async () => {
    const instance = await runner()
      .cwd(fixtures)
      .spawn('node -v')
      .code(0)
      .end();

    // ensure chain return instance
    assert.equal(instance.constructor.name, 'TestRunner');
  });

  it('should logger', async () => {
    await runner()
      .cwd(fixtures)
      .log('command-line test start')
      .spawn('node -v')
      .stdout(/v\d+\.\d+\.\d+/)
      .log('command-line test end')
      .end();
  });

  it('should export context', async () => {
    await runner()
      .cwd(fixtures)
      .env('a', 'b')
      .spawn('node -v')
      .tap(ctx => {
        ctx.assert(ctx.cwd === fixtures);
        ctx.assert(ctx.env.a === 'b');
        ctx.assert(ctx.proc);
        ctx.assert(ctx.result);
      })
      .end();
  });
});
