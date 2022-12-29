import EventEmitter from 'events';
import assert from 'node:assert/strict';
import logger from 'consola';

import { Process, ProcessEvents, ProcessOptions, ProcessResult } from './lib/process';
import { wrapFn, color } from './lib/utils';
// import { doesNotMatchRule, matchRule, matchFile, doesNotMatchFile } from './lib/assert';

export type HookFunction = (ctx: RunnerContext) => void | Promise<void>;
export type RestParam<T> = T extends (first: any, ...args: infer R) => any ? R : any;

export type MountPlugin<T, TestRunner> = {
  [key in keyof T]: T[key] extends (core: TestRunner, ...args: infer I) => any ? (...args: I) => MountPlugin<T, TestRunner> : undefined;
} & TestRunner;

// use `satisfies`
export interface PluginLike {
  [key: string]: (core: TestRunner, ...args: any[]) => any;
}

export interface RunnerContext {
  proc: Process;
  cwd: string;
  result: ProcessResult;
  autoWait?: boolean;
  debug?: boolean;
}

export class TestRunner extends EventEmitter {
  private logger = logger;
  private proc: Process;
  private hooks: Record<string, HookFunction[]> = {
    before: [],
    running: [],
    after: [],
    end: [],
  };

  plugin<T extends PluginLike>(plugins: T): MountPlugin<T, this> {
    for (const key of Object.keys(plugins)) {
      const initFn = plugins[key];

      this[key] = (...args: RestParam<typeof initFn>) => {
        initFn(this, ...args);
        return this;
      };
    }
    return this as any;
  }

  hook(event: string, fn: HookFunction) {
    this.hooks[event].push(wrapFn(fn));
    return this;
  }

  async runHook(event: string, ctx: RunnerContext) {
    for (const fn of this.hooks[event]) {
      await fn(ctx);
    }
  }

  async end() {
    try {
      const ctx: RunnerContext = {
        proc: this.proc,
        cwd: this.proc.opts.cwd!,
        result: this.proc.result,
        autoWait: true,
      };

      assert(this.proc, 'cmd is not registered yet');

      // before
      await this.runHook('before', ctx);

      // exec child process, don't await it
      await this.proc.start();

      this.proc.on('stdout', data => {
        console.log(color(data, 2, 22));
      });

      this.proc.on('stderr', data => {
        console.error(color(data, 2, 22));
      });

      // running
      await this.runHook('running', ctx);

      if (ctx.autoWait) {
        await this.proc.end();
      }

      // after
      await this.runHook('after', ctx);

      // ensure proc is exit if user forgot to call `wait('close')` after wait other event
      if (!ctx.autoWait) {
        await this.proc.end();
      }

      // error
      if (ctx.result instanceof Error) {
        await this.runHook('error', ctx);
      }

      // end
      for (const fn of this.hooks['end']) {
        await fn(ctx);
      }

      this.logger.success('Test pass.\n');
    } catch (err) {
      this.logger.error('Test failed.\n');
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

  debug(enabled = true) {
    return this.hook('before', ctx => {
      ctx.debug = enabled;
      // this.proc.debug(enabled);
    });
  }

  tap(fn: HookFunction) {
    return this.hook(this.proc ? 'after' : 'before', fn);
  }

  expect(fn: HookFunction) {
    return this.tap(async ctx => {
      // TODO: wrapfn here
      await fn.call(this, ctx);
    });
  }

  wait(type: ProcessEvents, expected) {
    // prevent auto wait
    this.hook('before', ctx => {
      ctx.autoWait = false;
    });

    // wait for process ready then assert
    this.hook('running', async ({ proc }) => {
      await proc.wait(type, expected);
    });

    return this;
  }

  // stdin() {
  //   // return this.proc.stdin();
  // }
}
