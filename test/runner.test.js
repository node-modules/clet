import runner from '../lib/runner.js';
import * as utils from './test-utils.js';
const { assert } = utils;

describe('test/runner.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');
  const tmpDir = utils.getTempDir();

  beforeEach(() => utils.initDir(tmpDir));

  it('should work', async () => {
    const instance = await runner()
      .cwd(fixtures)
      .fork('./example.js', [ '--name=test' ])
      .stdout('this is example bin')
      .stdout(/argv:/)
      .notStdout('xxxx')
      .notStdout(/^abc/)
      .log('result: %j', 'result.stdout')
      .code(0)
      .end();

    // ensure chain return instance
    assert.equal(instance.constructor.name, 'TestRunner');
  });

  it('should logger', async () => {
    await runner()
      .cwd(fixtures)
      .log('command-line test start')
      .fork('example.js')
      .stdout(/this is example/)
      .log('command-line test end')
      .end();
  });

  it('should export context', async () => {
    await runner()
      .cwd(fixtures)
      .env('a', 'b')
      .spawn('npm -v')
      .tap(ctx => {
        ctx.assert(ctx.cwd === fixtures);
        ctx.assert(ctx.env.a === 'b');
        ctx.assert(ctx.proc);
        ctx.assert(ctx.result);
      })
      .end();
  });
});
