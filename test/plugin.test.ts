import { strict as assert } from 'assert';
import { Runner, TestRunnerContext, runner } from '../src/runner';

describe('test/plugin.test.js', () => {
  it('should support options.plugins', async () => {
    const opts = {
      plugins: [
        function(target) {
          target.ctx.cache = {};
          target.cache = function(key: string, value: string) {
            this.ctx.cache[key] = value;
            return this;
          };
        },
      ],
    };

    interface customCtx extends TestRunnerContext {
      cache: { [key: string]: string }
    }

    interface customRunner extends Runner {
      cache(key: string, value: string): customCtx
    }

    const ctx = await (runner(opts) as customRunner)
      .spawn('node', [ '-v' ])
      .cache('a', 'b');

    assert.equal(ctx.cache.a, 'b');
  });

  it('should register(fn)', async () => {
    interface customRunner extends Runner {
      ctx: TestRunnerContext & {
        cache: {
          [key: string]: string
        }
      },
      cache(this: customRunner, key: string, value: string): customRunner
    }

    const ctx = await (runner()
      .register((target: customRunner) => {
        target.ctx.cache = {};
        target.cache = function(key: string, value: string) {
          this.ctx.cache[key] = value;
          return this;
        };
      })
      .spawn('node', [ '-v' ]) as customRunner)
      .cache('a', 'b');

    assert.equal((ctx as customRunner['ctx']).cache.a, 'b');
  });

  it('should register(obj)', async () => {
    const ctx = await (runner()
      .register({
        a(...args) {
          (this as any).ctx.a = args.join(',');
          return this;
        },
        b(...args) {
          (this as any).ctx.b = args.join(',');
          return this;
        },
      })
      .spawn('node', [ '-v' ]) as any)
      .a(1, 2)
      .b(1);

    assert.equal(ctx.a, '1,2');
    assert(ctx.b, '1');
  });
});
