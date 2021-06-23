/** @module Runner */

import BaseSDK from './base.js';
import * as utils from './utils.js';

import * as validatorPlugin from './validator.js';
import * as processPlugin from './process.js';
import * as filePlugin from './file.js';
import * as operationPlugin from './operation.js';
import * as httpPlugin from './http.js';

const { assert } = utils;

class TestRunner extends BaseSDK {
  constructor(opts) {
    opts = {
      autoWait: true,
      ...opts,
    };
    super(opts);

    this.assert = utils.assert;

    // middleware.pre -> before -> fork -> runing -> after -> end -> midlleware.post -> cleanup
    this._beforeChains = [];
    this._runningChains = [];
    this._afterChains = [];
    this._endChains = [];
    this._promptList = [];
    this._expectedExitCode = undefined;

    this.proc = undefined;

    this._initContext();
    this.register(validatorPlugin);
    this.register(operationPlugin);
    this.register(processPlugin);
    this.register(filePlugin);
    this.register(httpPlugin);
    this._hookEvent();
  }

  /**
   * @typedef RunnerContext
   *
   * @property {String} result.stdout
   * @property {String} result.stderr
   * @property {Number} result.code
   */

  /**
   * init context
   * @private
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
        // execArgv: process.execArgv,
        // extendEnv: true,
        // preferLocal: false,
      },

      get cwd() { return this.cmdOpts.cwd; },
      get env() { return this.cmdOpts.env; },
      get proc() { return this.instance.proc; },

      result: {
        stdout: '',
        stderr: '',
        code: undefined,
      },
    };
  }

  _hookEvent() {
    this.hookPrompt();
  }

  _addChain(fn, position) {
    if (!position) position = this.ctx.cmd ? 'after' : 'before';

    assert([ 'before', 'running', 'after', 'end' ].includes(position), `unexpected position ${position}`);

    const chains = this[`_${position}Chains`];
    chains.push(fn);
    return this;
  }

  /**
   * Perform the test.
   *
   * @return {Runner} instance for chain
   */
  end() {
    // cleanup
    this.middlewares.unshift(async (ctx, next) => {
      try {
        await next();
      } finally {
        // kill proc if still alive, when assert fail with long-run server, it will reach here
        if (this.proc && this.proc.connected) {
          this.logger.warn(`still alive, kill ${this.proc.pid}`);
          this.proc.kill();
          await this.proc;
        }
      }
    });

    const runChains = async (chains, ctx) => {
      for (const fn of chains) {
        // this.logger.info('run chain fn:', fn.name);
        await fn(ctx);
      }
    };

    return this._launchChains(this.middlewares, async ctx => {
      // before runing
      await runChains(this._beforeChains, ctx);

      // run command
      const proc = this._execCommand();

      // running
      await runChains(this._runningChains, ctx);

      // auto wait proc to exit, then assert, use for not-long-run command
      // othersize, need to call `.wait()` manually
      if (this.options.autoWait) {
        await proc;
      }

      // after running
      await runChains(this._afterChains, ctx);

      // ensure proc is exit if user forgot to call `wait('end')` after wait other event
      await proc;

      // after exit
      await runChains(this._endChains, ctx);

      // if developer don't call `.code()`, will rethrow proc error in order to avoid omissions
      if (this._expectedExitCode === undefined) {
        // `killed` is true only if call `kill()/cancel()` manually
        const { failed, isCanceled, killed } = ctx.res;
        if (failed && !isCanceled && !killed) throw ctx.res;
      }

      return this;
    });
  }
}

export { TestRunner };
export default opts => new TestRunner(opts);
