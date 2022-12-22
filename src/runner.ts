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
    prerun: [],
    run: [],
    postrun: [],
    end: [],
  };

  // prerun 准备现场环境
  // run 处理 stdin
  // postrun 检查 assert
  // end 检查 code，清理现场

  plugin(plugins: PluginLike): MountPlugin<PluginLike, this> {
    for (const key of Object.keys(plugins)) {
      const initFn = plugins[key];

      this[key] = (...args: RestParam<typeof initFn>) => {
        console.log('mount %s with %j', key, ...args);
        this.use(initFn(this, ...args));
        return this;
      };
    }
    return this as any;
  }

  hook(event: string, fn: AsyncFunction) {
    this.hooks[event].push(fn);
    return this;
  }

  async runHook(event: string) {
    for (const fn of this.hooks[event]) {
      // TODO: ctx
      await fn();
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

  end() {
    try {
      // prerun
      // run
      // postrun
      // end
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

    console.log(this.middlewares);
    return Promise.all(this.middlewares.map(fn => fn()));
  }
}


function file(runner: TestRunner, opts: { a: string }) {
  runner.someMethod();
  return async function fileMiddleare() {
    console.log('run file');
  };
}

function sleep(runner: TestRunner, b: number) {
  // console.log('sleep init', b);
  return async function sleepMiddleare() {
    console.log('run sleep');
  };
}

new TestRunner()
  .plugin({ file, sleep })
  .file({ 'a': 'b' })
  .sleep(1)
  .sleep(222)
  .end().then(() => console.log('done'));
