import runner from '../lib/runner';
import * as utils from './utils';

describe('test/index.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');
  const tmpDir = utils.getTempDir(expect);

  beforeEach(() => utils.initDir(tmpDir));

  it('should fork cli', async () => {
    await runner()
      .cwd(fixtures)
      .fork('./simple.js', [ '--name=test' ])
      .stdout('this is simple bin')
      .stdout(/--name=\w+/)
      .notStderr(/.+/)
      .code(0)
      .log('result: %j', 'result')
      .end();
  });

  it('should spawn', async () => {
    await runner()
      .cwd(fixtures)
      .fork('./simple.js', [ '--name=test' ])
      .stdout('this is simple bin')
      .stdout(/--name=\w+/)
      .notStderr(/.+/)
      .code(0)
      .log('result: %j', 'result')
      .end();
  });
});
