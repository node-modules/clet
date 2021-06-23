import runner from '../lib/runner.js';
import * as utils from './test-utils.js';
const { assert } = utils;

describe('test/runner.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');
  const tmpDir = utils.getTempDir(expect);

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

  it('should ensure proc is kill if assert fail', async () => {
    await assert.rejects(async () => {
      await runner()
        .cwd(fixtures)
        .fork('long-run.js')
        .wait('stdout', /long run/)
        .tap(() => {
          throw new Error('fork trigger break');
        })
        .end();
    }, /fork trigger break/);

    await assert.rejects(async () => {
      await runner()
        .cwd(fixtures)
        .spawn('node', [ 'long-run.js' ])
        .wait('stdout', /long run/)
        .tap(() => {
          throw new Error('spawn trigger break');
        })
        .end();
    }, /spawn trigger break/);
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
});
