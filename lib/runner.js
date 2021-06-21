/** @module Runner */

import BaseSDK from './base';
import * as utils from './utils';

import * as validatorPlugin from './validator';
import * as processPlugin from './process';
import * as filePlugin from './file';
import * as operationPlugin from './operation';
import * as httpPlugin from './http';

class TestRunner extends BaseSDK {
  constructor(opts) {
    opts = {
      autoWait: true,
      ...opts,
    };
    super(opts);

    this.assert = utils.assert;

    // middleware.pre -> prepare -> fork -> running -> ending -> midlleware.post -> cleanup
    this._prepareChains = [];
    this._runningChains = [];
    this._endingChains = [];
    this._promptList = [];

    this.proc = undefined;

    this._initContext();
    this.register(validatorPlugin);
    this.register(operationPlugin);
    this.register(processPlugin);
    this.register(filePlugin);
    this.register(httpPlugin);
  }

  /**
   * @typedef RunnerContext
   *
   * @property {String} result.stdout
   * @property {String} result.stderr
   * @property {Number} result.code
   */

  _initContext() {
    this.ctx = {
      ...this.ctx,

      assert: this.assert,

      // commander
      cmd: undefined,
      cmdType: undefined,
      cmdArgs: undefined,
      cmdOpts: {
        reject: false,
        cwd: process.cwd(),
        env: {},
        // left these to use default
        // timeout: 0,
        // extendEnv: true,
      },

      get cwd() { return this.cmdOpts.cwd; },
      get env() { return this.cmdOpts.env; },

      result: {
        stdout: '',
        stderr: '',
        code: undefined,
      },
    };
  }

  _addChain(fn) {
    const chains = this.ctx.cmd ? this._runningChains : this._prepareChains;
    chains.push(fn);
    return this;
  }

  end() {
    // cleanup
    this.middlewares.unshift(async (ctx, next) => {
      try {
        await next();
      } finally {
        // kill cli if still alive
        if (this.proc && this.proc.connected) {
          this.logger.warn(`still alive, kill ${this.proc.pid}`);
          this.proc.kill();
          await this.proc;
        }
      }
    });

    return this._launchChains(this.middlewares, async ctx => {
      // before runing
      for (const fn of this._prepareChains) {
        await fn(ctx);
      }

      // run cli
      const proc = this._execCommand();

      // auto wait proc to exit, then assert, use for not-long-run cli
      // othersize, need to call `.wait()` manually
      if (this.options.autoWait) {
        await proc;
      }

      // after running
      for (const fn of this._runningChains) {
        await fn(ctx);
      }

      // ensure proc is exit if user forgot to call `wait('end')` after wait other event
      await proc;

      // after exit
      for (const fn of this._endingChains) {
        await fn(ctx);
      }

      // rethrow error after all assertion
      const { failed, isCanceled, killed } = ctx.res;
      if (failed && !isCanceled && !killed) throw ctx.res;

      return this;
    });
  }
}

export { TestRunner };
export default opts => new TestRunner(opts);
