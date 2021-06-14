import runner from '..';
import path from 'path';
import { dirname } from 'dirname-filename-esm';

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

describe('test/runner.test.js', () => {
  const fixtures = path.resolve(dirname(import.meta), 'fixtures');

  it('should work', async () => {
    return runner()
      // .middleware(async (ctx, next) => {
      //   ctx.logger.info('1');
      //   await next();
      //   ctx.logger.info('4');
      // })
      // .middleware(async (ctx, next) => {
      //   ctx.logger.info('2');
      //   await next();
      //   ctx.logger.info('3');
      // })
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
        await sleep(1000);
        ctx.assert(stdout, /simple bin/);
      })
      .code(0)
      .end();
  });
});
