import runner from '..';
import * as utils from './utils';

describe('test/plugin.test.js', () => {
  it('should register(fn)', async () => {
    const { ctx } = await runner()
      .register(target => {
        target.ctx.cache = {};
        target.cache = function(key, value) {
          this.ctx.cache[key] = value;
          return this;
        };
      })
      .spawn('node', [ '-v' ])
      .cache('a', 'b')
      .end();

    utils.assert.equal(ctx.cache.a, 'b');
  });

  it('should register(obj)', async () => {
    const { ctx } = await runner()
      .register({
        a(...args) {
          this.ctx.a = args.join(',');
          return this;
        },
        b(...args) {
          // not return this
          this.ctx.b = args.join(',');
        },
      })
      .spawn('node', [ '-v' ])
      .a(1, 2)
      .b(1)
      .end();

    utils.assert.equal(ctx.a, '1,2');
    utils.assert(ctx.b, '1');
  });
});
