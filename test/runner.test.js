import runner from '..';
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
      .expect(ctx => {
        const { stdout } = ctx.result;
        ctx.assert(stdout, /simple bin/);
      })
      .expect(async ctx => {
        const { stdout } = ctx.result;
        await utils.sleep(1000);
        ctx.assert(stdout, /simple bin/);
      })
      .code(0)
      .end();

    // ensure chain return instance
    utils.assert.equal(instance.constructor.name, 'TestRunner');
  });
});
