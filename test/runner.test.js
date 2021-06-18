import runner from '../lib/runner';
import * as utils from './utils';

describe('test/runner.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');

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

  it('should await event', async () => {
    await runner()
      .cwd(fixtures)
      .fork('./long-run.js')

      .wait('stdout', /loading egg controller/)
      // .log('result.stdout')

      .wait('message', { action: 'egg-ready' })
      .stdout(/send message to parent/)
      .notStdout(/after send message/)
      // .log('result.stdout')

      .wait('close')
      .code(0)
      .end();
  });
});
