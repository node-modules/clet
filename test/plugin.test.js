import { it, describe } from 'vitest';
import { strict as assert } from 'assert';
import { runner } from '../lib/runner.js';

describe('test/plugin.test.js', () => {
  it('should support options.plugins', async () => {
    const opts = {
      plugins: [
        function(target) {
          target.ctx.cache = {};
          target.cache = function(key, value) {
            this.ctx.cache[key] = value;
            return this;
          };
        },
      ],
    };

    const ctx = await runner(opts)
      .spawn('node', [ '-v' ])
      .cache('a', 'b');

    assert.equal(ctx.cache.a, 'b');
  });

  it('should register(fn)', async () => {
    const ctx = await runner()
      .register(target => {
        target.ctx.cache = {};
        target.cache = function(key, value) {
          this.ctx.cache[key] = value;
          return this;
        };
      })
      .spawn('node', [ '-v' ])
      .cache('a', 'b');

    assert.equal(ctx.cache.a, 'b');
  });

  it('should register(obj)', async () => {
    const ctx = await runner()
      .register({
        a(...args) {
          this.ctx.a = args.join(',');
          return this;
        },
        b(...args) {
          this.ctx.b = args.join(',');
          return this;
        },
      })
      .spawn('node', [ '-v' ])
      .a(1, 2)
      .b(1);

    assert.equal(ctx.a, '1,2');
    assert(ctx.b, '1');
  });
});
