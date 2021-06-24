import runner from '../lib/runner.js';
import { strict as assert } from 'assert';

describe('test/middleware.test.js', () => {
  it('should support middleware', async () => {
    const tmp = [];
    await runner()
      .middleware(async (ctx, next) => {
        tmp.push('1');
        await next();
        tmp.push('5');
      })
      .middleware(async (ctx, next) => {
        tmp.push('2');
        await next();
        tmp.push('4');
      })
      .spawn('node -p "3"')
      .tap(ctx => {
        tmp.push(ctx.result.stdout.replace(/\r?\n/, ''));
      })
      .end();

    // check
    assert.equal(tmp.join(''), '12345');
  });

  it('should always fork after middleware', async () => {
    const tmp = [];
    await runner()
      .middleware(async (ctx, next) => {
        tmp.push('1');
        await next();
        tmp.push('5');
      })

      .spawn('node -p "3"')
      .tap(ctx => {
        tmp.push(ctx.result.stdout.replace(/\r?\n/, ''));
      })

      .middleware(async (ctx, next) => {
        tmp.push('2');
        await next();
        tmp.push('4');
      })
      .end();

    // check
    assert.equal(tmp.join(''), '12345');
  });
});
