import EventEmitter from 'events';
import assert from 'node:assert/strict';

import { Process, ProcessEvents, ProcessOptions, ProcessResult } from './lib/process';
import { wrapFn } from './lib/utils';
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

export interface RunnerOptions {
  autoWait?: boolean;
}

export interface RunnerContext {
  proc: Process;
  cwd: string;
  result: ProcessResult;
  autoWait?: boolean;
}

export class TestRunner extends EventEmitter {
  private logger = console;
  private proc: Process;
  private options: RunnerOptions = {};
  private hooks: Record<string, HookFunction[]> = {
    before: [],
    running: [],
    after: [],
    end: [],
  };

  constructor(opts?: RunnerOptions) {
    super();
    this.options = {
      // autoWait: true,
      ...opts,
    };
    // console.log(this.options);
  }

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

  async end() {
    try {
      const ctx: RunnerContext = {
        proc: this.proc,
        cwd: this.proc.opts.cwd!,
        result: this.proc.result,
        autoWait: true,
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

      if (ctx.autoWait) {
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
