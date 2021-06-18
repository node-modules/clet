import runner from '../lib/runner';
import * as utils from './utils';
import path from 'path';

describe('test/runner.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');
  const tmpDir = utils.getTempDir(expect);

  beforeEach(() => utils.initDir(tmpDir));

  it('should work', async () => {
    const instance = await runner()
      .cwd(fixtures)
      .fork('./simple.js', [ '--name=test' ])
      .wait('close')
      .stdout('this is simple bin')
      .stdout(/argv:/)
      .notStdout('xxxx')
      .notStdout(/^abc/)
      .log('result: %j', 'result.stdout')
      .code(0)
      .end();

    // ensure chain return instance
    utils.assert.equal(instance.constructor.name, 'TestRunner');
  });

  it('should await event', async () => {
    const filePath = path.join(tmpDir, 'event.md');

    await runner()
      .cwd(fixtures)
      .env('filePath', filePath)
      .notFile(filePath)
      .fork('./long-run.js')

      .tap(() => console.log(new Date().toLocaleString()))
      .notFile(filePath)
      .wait('message', { action: 'egg-ready' })
      .file(filePath)

      .wait('close')
      .code(0)
      .end();
  });
});
