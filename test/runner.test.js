
import { strict as assert } from 'assert';

import runner from '../lib/runner';
import * as utils from './utils';

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
          throw new Error('trigger break');
        })
        .end();
    }, /trigger break/);
  });

  it.todo('logger');
});
