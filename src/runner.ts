import EventEmitter from 'events';
import assert from 'node:assert/strict';

import { MountPlugin, PluginLike, AsyncFunction, RestParam } from './types';
import { Process, ProcessEvents, ProcessOptions } from './lib/process';
import * as validator from './plugins/validator';
import * as operation from './plugins/operation';
import { doesNotMatchRule, matchRule, matchFile, doesNotMatchFile } from './lib/assert';

interface RunnerOptions {
  autoWait?: boolean;
}

type BuiltinPlugin<T extends PluginLike, Core> = {
  [key in keyof T]: (...args: RestParam<T[key]>) => Core;
};

export function runner(opts?: RunnerOptions) {
  return new TestRunner(opts); // .plugin({ ...validator, ...operation });
}

export interface TestRunner extends BuiltinPlugin<typeof validator, TestRunner>, BuiltinPlugin<typeof operation, TestRunner> {}

export class TestRunner extends EventEmitter {
  private logger = console;
  private proc: Process;
  private options: RunnerOptions = {};
  private hooks = {
    before: [],
    running: [],
    after: [],
    end: [],
  };

  constructor(opts?: RunnerOptions) {
    super();
    this.options = {
      autoWait: true,
      ...opts,
    };

    this.plugin({ ...validator, ...operation });
  }

  // prepare 准备现场环境
  // prerun 检查参数，在 fork 定义之后
  // run 处理 stdin
  // postrun 检查 assert
  // end 检查 code，清理现场，相当于 finnaly

  plugin(plugins: PluginLike): MountPlugin<PluginLike, this> {
    for (const key of Object.keys(plugins)) {
      const initFn = plugins[key];

      this[key] = (...args: RestParam<typeof initFn>) => {
        console.log('mount %s with %s', key, ...args);
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

  async end() {
    try {
      const ctx = {
        proc: this.proc,
        cwd: this.proc.opts.cwd,
        result: this.proc.result,
      };

      // before
      for (const fn of this.hooks['before']) {
        await fn(ctx);
      }

      // exec child process, don't await it
      await this.proc.start();

      // running
      for (const fn of this.hooks['running']) {
        await fn(ctx);
      }

      if (this.options.autoWait) {
        await this.proc.end();
      }

      // postrun
      for (const fn of this.hooks['after']) {
        await fn(ctx);
      }

      // end
      for (const fn of this.hooks['end']) {
        await fn(ctx);
      }

      this.logger.info('✔ Test pass.\n');
    } catch (err) {
      this.logger.error('⚠ Test failed.\n');
      throw err;
    } finally {
      // clean up
      this.proc.kill();
    }
  }

  fork(cmd: string, args?: string[], opts?: ProcessOptions) {
    assert(!this.proc, 'cmd can not be registered twice');
    this.proc = new Process('fork', cmd, args, opts);
    return this;
  }

  spawn(cmd: string, args?: string[], opts?: ProcessOptions) {
    assert(!this.proc, 'cmd can not be registered twice');
    this.proc = new Process('spawn', cmd, args, opts);
    return this;
  }

  wait(type: ProcessEvents, expected) {
    this.options.autoWait = false;
    // wait for process ready then assert
    return this.hook('running', async ({ proc }) => {
      // ctx.autoWait = false;
      await proc.wait(type, expected);
    });
  }

  // stdout(expected: string | RegExp) {
  //   return this.hook('postrun', async ctx => {
  //     matchRule(ctx.result.stdout, expected);
  //   });
  // }

  // notStdout(expected: string | RegExp) {
  //   return this.hook('postrun', async ctx => {
  //     doesNotMatchRule(ctx.result.stdout, expected);
  //   });
  // }

  // stderr(expected: string | RegExp) {
  //   return this.hook('postrun', async ctx => {
  //     matchRule(ctx.result.stderr, expected);
  //   });
  // }

  // notStderr(expected: string | RegExp) {
  //   return this.hook('postrun', async ({ result }) => {
  //     doesNotMatchRule(result.stderr, expected);
  //   });
  // }

  // file(filePath: string, expected: string | RegExp) {
  //   return this.hook('postrun', async ({ cwd }) => {
  //     const fullPath = path.resolve(cwd, filePath);
  //     await matchFile(fullPath, expected);
  //   });
  // }

  // notFile(filePath: string, expected: string | RegExp) {
  //   return this.hook('postrun', async ({ cwd }) => {
  //     const fullPath = path.resolve(cwd, filePath);
  //     await doesNotMatchFile(fullPath, expected);
  //   });
  // }

  // code(expected: number) {
  //   return this.hook('postrun', async ({ result }) => {
  //     assert.equal(result.code, expected);
  //   });
  // }
}

// function fork(runner: TestRunner, cmd, args, opts) {
//   runner.hook('prerun', async ctx => {
//     ctx.cmd = cmd;
//     ctx.args = args;
//     ctx.opts = opts;
//     console.log('run fork', cmd, args, opts);
//   });
// }


// function file(runner: TestRunner, opts: { a: string }) {
//   runner.hook('postrun', async ctx => {
//     console.log('run file', ctx, opts);
//   });
// }

// function sleep(runner: TestRunner, b: number) {
//   runner.hook('postrun', async ctx => {
//     console.log('run sleep', ctx, b);
//   });
// }

// new TestRunner()
//   .plugin({ file, sleep, fork })
//   .file({ 'a': 'b' })
//   .fork('node', '-v')
//   .sleep(1)
//   .sleep(222)
//   .end().then(() => console.log('done'));

// koa middleware
// 初始化 -> fork -> await next() -> 校验 -> 结束
