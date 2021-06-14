import runner from '..';
import path from 'path';
import { dirname } from 'dirname-filename-esm';

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
      // .expect(ctx => {
      //   ctx.logger.info('assert');
      // })
      .cwd(fixtures)
      .fork('./simple.js', [ '--name=test' ])
      .stdout('this is simple bin')
      .stdout(/argv:/)
      .notStdout('xxxx')
      .notStdout(/^abc/)
      .end();
  });
});
