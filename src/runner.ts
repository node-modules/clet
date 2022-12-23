import EventEmitter from 'events';

import { MountPlugin, PluginLike, AsyncFunction, RestParam } from './types';

// interface Pluginable<T> {
//   [key: string]: (runner: T, options?: any) => AsyncFunction;
// }

export class TestRunner extends EventEmitter {
  private logger = console;
  private middlewares: any[] = [];
  private hooks = {
    // before: [],
    // running: [],
    // after: [],
    prepare: [],
    prerun: [],
    run: [],
    postrun: [],
    end: [],
  };

  // prepare 准备现场环境
  // prerun 检查参数，在 fork 定义之后
  // run 处理 stdin
  // postrun 检查 assert
  // end 检查 code，清理现场，相当于 finnaly

  plugin(plugins: PluginLike): MountPlugin<PluginLike, this> {
    for (const key of Object.keys(plugins)) {
      const initFn = plugins[key];

      this[key] = (...args: RestParam<typeof initFn>) => {
        console.log('mount %s with %j', key, ...args);
        initFn(this, ...args);
        return this;
      };
    }
    return this as any;
  }

  hook(event: string, fn: AsyncFunction) {
    this.hooks[event].push(fn);
    return this;
  }

  async runHook(event: string, ctx) {
    for (const fn of this.hooks[event]) {
      // TODO: ctx
      await fn(ctx);
    }
  }

  someMethod() {
    console.log('someMethod');
  }

  // hook?
  use(fn: AsyncFunction) {
    this.middlewares.push(fn);
    return this;
  }

  async end() {
    try {
      const ctx = { a: 1};
      // prerun
      await this.runHook('prerun', ctx);

      // run
      await this.runHook('run', ctx);

      // postrun
      await this.runHook('postrun', ctx);

      // end
      await this.runHook('end', ctx);

      this.logger.info('✔ Test pass.\n');
    } catch (err) {
      this.logger.error('⚠ Test failed.\n');
      throw err;
    } finally {
      // clean up
    }

    // prepare/prerun
    //   - init dir, init env, init ctx
    // run
    //   - run cli
    //   - collect stdout/stderr, emit event
    //   - stdin (expect)
    // postrun
    //   - wait event(end, message, error, stdout, stderr)
    //   - check assert
    // end
    //   - clean up, kill, log result, error hander

    // console.log(this.middlewares);
    // return Promise.all(this.middlewares.map(fn => fn()));
  }
}

function fork(runner: TestRunner, cmd, args, opts) {
  runner.hook('prerun', async ctx => {
    ctx.cmd = cmd;
    ctx.args = args;
    ctx.opts = opts;
    console.log('run fork', cmd, args, opts);
  });
}


function file(runner: TestRunner, opts: { a: string }) {
  runner.hook('postrun', async ctx => {
    console.log('run file', ctx, opts);
  });
}

function sleep(runner: TestRunner, b: number) {
  runner.hook('postrun', async ctx => {
    console.log('run sleep', ctx, b);
  });
}

new TestRunner()
  .plugin({ file, sleep, fork })
  .file({ 'a': 'b' })
  .fork('node', '-v')
  .sleep(1)
  .sleep(222)
  .end().then(() => console.log('done'));

// koa middleware
// 初始化 -> fork -> await next() -> 校验 -> 结束
