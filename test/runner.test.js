import runner from '..';

describe('test/runner.test.js', () => {
  it('should work', async () => {
    return runner()
      .middleware(async (ctx, next) => {
        console.log('1');
        await next();
        console.log('4');
      })
      .middleware(async (ctx, next) => {
        console.log('2');
        await next();
        console.log('3');
      })
      .expect(ctx => {
        console.log('assert', ctx);
      })
      .stdout()
      .run('ls ./')
      .end();
  });
});
