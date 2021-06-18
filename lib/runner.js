import { compose } from 'throwback';
import execa from 'execa';
import dotProp from 'dot-prop';
import EventEmitter from 'events';
import pEvent from 'p-event';

import * as assertion from './assertion/index';
import * as operation from './operation';
import * as utils from './utils';
import assert from './assert-extend';
import logger from './logger';

class TestRunner extends EventEmitter {
  constructor(opts) {
    super();
    this.options = opts || {};

    // TODO: new a logger for clone
    this.logger = logger;
    this.assert = assert;

    // chain context
    const ctx = {
      runner: this,
      logger: this.logger,
      assert: this.assert,

      // commander
      env: {},
      cwd: process.cwd(),
      cmd: undefined,
      cmdType: undefined,
      cmdArgs: undefined,
      cmdOpts: {
        extendEnv: true,
        reject: false,
        get cwd() { return ctx.cwd; },
        get env() { return ctx.env; },
      },

      result: {
        stdout: '',
        stderr: '',
        code: undefined,
      },
    };
    this.ctx = ctx;

    // middleware.pre -> prepare -> fork -> running -> ending -> midlleware.post -> cleanup
    this.middlewares = [];
    this._prepareChains = [];
    this._runningChains = [];
    this._endingChains = [];

    this.proc = undefined;

    this.register(assertion);
    this.register(operation);
    this.register(this.options.plugins);
  }

  middleware(fn) {
    // TODO: function.length?
    this.middlewares.push(fn);
    return this;
  }

  log(format, ...keys) {
    this._addChain(ctx => {
      this.logger.info(format, keys.map(k => dotProp.get(ctx, k)));
    });
    return this;
  }

  register(fn) {
    if (!fn) return this;

    if (typeof fn === 'function') {
      fn(this);
    } else {
      for (const key of Object.keys(fn)) {
        this[key] = (...args) => {
          fn[key].call(this, ...args);
          // force return for chain
          return this;
        };
      }
    }
    return this;
  }

  cwd(dir) {
    this.ctx.cwd = dir;
    return this;
  }

  // override opts.env
  env(key, value) {
    // assert should before fork
    this.ctx.env[key] = value;
    return this;
  }

  fork(cmd, args, opts) {
    return this._registerCommand('fork', cmd, args, opts);
  }

  spawn(cmd, args, opts) {
    return this._registerCommand('spawn', cmd, args, opts);
  }

  // exec(cmd, opts) {
  //   return this._registerCommand('exec', cmd, undefined, opts);
  // }

  _registerCommand(cmdType, cmd, cmdArgs, cmdOpts) {
    assert(!this.ctx.cmd, `command \`${this.ctx.cmd}\` had registered`);
    assert(!cmdOpts || !cmdOpts.env, 'use `.env()` to set environment');
    assert(!cmdOpts || !cmdOpts.cwd, 'use `.cwd()` to set environment');

    Object.assign(this.ctx, { cmd, cmdType, cmdArgs });
    Object.assign(this.ctx.cmdOpts, cmdOpts);
    return this;
  }

  _addChain(fn) {
    const chains = this.ctx.cmd ? this._runningChains : this._prepareChains;
    chains.push(fn);
    return this;
  }

  _wait(type, expected) {

  }

  waitStdout(expected) {
    const filterFn = utils.makeCheckFn(expected);
    return this._addChain(async ctx => {
      await Promise.race([
        // wait for stdout match
        pEvent(this, 'stdout', () => {
          return filterFn(ctx.result.stdout);
        }),
        // if proc is exit, just resolve
        pEvent(this, 'close'),
      ]);
    });
  }

  wait(eventName) {
    const promise = pEvent(this, 'message', data => data && data.action === eventName);
    return this._addChain(async ctx => {
      const arr = [ promise ];

      // if proc exit, it will resolve immediately
      if (!this.proc.exitCode) {
        arr.push(this.proc);
      }
      await Promise.race(arr);
    });
  }

  _execCommand() {
    const { cmdType, cmd, cmdArgs, cmdOpts } = this.ctx;
    this.logger.info('execCommand: %s(%s %s %j)', cmdType, cmd, cmdArgs || '', cmdOpts);

    const execCommand = { fork: execa.node, spawn: execa }[cmdType];

    this.proc = execCommand(cmd, cmdArgs, cmdOpts);

    this.proc.stdout.on('data', data => {
      this.ctx.result.stdout += data.toString();
      this.emit('stdout', data.toString());
    });

    this.proc.stderr.on('data', data => {
      this.ctx.result.stderr += data.toString();
      this.emit('stderr', data.toString());
    });

    this.proc.on('message', data => {
      this.emit('message', data);
      this.logger.debug('message event:', data);
    });

    this.proc.once('close', code => {
      this.emit('close', code);
      this.logger.debug('close event:', code);
    });

    return this.proc;
  }

  end() {
    const cleanup = async (ctx, next) => {
      try {
        await next();

        // ensure chain return instance
        return this;
      } finally {
        // kill cli if still alive
        this.logger.info('clean up');
      }
    };

    const fn = compose([ cleanup, ...this.middlewares ]);

    return fn(this.ctx, async ctx => {
      // before command
      for (const fn of this._prepareChains) {
        await fn(ctx);
      }

      // TODO: message could be obj
      // TODO: await event: ready, unready, timeout

      // run cli
      const proc = this._execCommand();

      // running
      // for (const fn of this._runningChains) {
      //   await fn(ctx);
      // }

      // wait for exit
      // { command, escapedCommand, exitCode, stdout, stderr, all, failed, timedOut, isCanceled, killed }
      const res = await proc;
      ctx.res = res;
      ctx.result.code = res.exitCode;

      for (const fn of this._runningChains) {
        await fn(ctx);
      }
      // after exit
      for (const fn of this._endingChains) {
        await fn(ctx);
      }

      // rethrow error after all assertion
      if (ctx.res.failed) throw ctx.res;

      return this;
    });
  }
}

export { TestRunner };
export default opts => new TestRunner(opts);
