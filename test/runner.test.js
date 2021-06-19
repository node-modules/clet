import runner from '../lib/runner';
import * as utils from './utils';

describe('test/runner.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');
  const tmpDir = utils.getTempDir(expect);

  beforeEach(() => utils.initDir(tmpDir));

  it('should work', async () => {
    const instance = await runner()
      .cwd(fixtures)
      .fork('./simple.js', [ '--name=test' ])
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

  it.todo('kill');
  it.todo('timeout');
});
