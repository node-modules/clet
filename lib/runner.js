import { compose } from 'throwback';
import execa from 'execa';
import dotProp from 'dot-prop';
import EventEmitter from 'events';
import pEvent from 'p-event';

import * as assertion from './assertion/index';
import * as operation from './operation';
import assert from './assert-extend';
import logger from './logger';

class TestRunner extends EventEmitter {
  constructor(opts) {
    super();
    this.options = {
      extendEnv: true,
      ...opts,
    };

    // TODO: new a logger for clone
    this.logger = logger;
    this.assert = assert;

    // chain
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
        extendEnv: this.options.extendEnv,
        reject: false,
        get cwd() { return ctx.cwd; },
        get env() { return ctx.env; },
      },
    };
    this.ctx = ctx;

    this.middlewares = [];
    this._beforeChains = [];
    this._runningChains = [];
    this._afterChains = [];

    this.proc = undefined;
    this.started = false;

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
    assert(!cmdOpts || !cmdOpts.env, 'use `.env()` to set environment');
    assert(!cmdOpts || !cmdOpts.cwd, 'use `.cwd()` to set environment');

    Object.assign(this.ctx, { cmd, cmdType, cmdArgs });
    Object.assign(this.ctx.cmdOpts, cmdOpts);
    // this.cmdOpts.env = { ...this.cmdOpts && this.cmdOpts.env, ... opts && opts.env };
    // this.cmdOpts = { ...this.cmdOpts, ...opts };
    return this;
  }

  _addChain(fn) {
    const chains = this.ctx.cmd ? this._runningChains : this._beforeChains;
    chains.push(fn);
    return this;
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

  end() {
    const cleanup = async (ctx, next) => {
      try {
        await next();

        // ensure chain return instance
        return this;
      } finally {
        // kill cli if still alive
        this.started = false;
        this.logger.info('clean up');
      }
    };

    const fn = compose([ cleanup, ...this.middlewares ]);

    return fn(this.ctx, async ctx => {
      // before command
      for (const fn of this._beforeChains) {
        await fn(ctx);
      }

      // run cli
      const { cmdType, cmd, cmdArgs, cmdOpts } = ctx;
      this.logger.info('execCommand: %s(%s %s %j)', cmdType, cmd, cmdArgs || '', cmdOpts);

      const execCommand = { fork: execa.node, spawn: execa }[cmdType];

      this.proc = execCommand(cmd, cmdArgs, cmdOpts);
      this.proc.then(res => {
        ctx.res = res;
        ctx.result = {
          ...ctx.result,
          stdout: res.stdout,
          stderr: res.stderr,
          code: res.exitCode,
        };
      });
      this.started = true;

      ctx.result = {
        stdout: '',
        stderr: '',
      };

      this.proc.stdout.on('data', data => {
        this.emit('stdout', data.toString());
        ctx.result.stdout += data.toString();
      });

      this.proc.stderr.on('data', data => {
        this.emit('stderr', data.toString());
        ctx.result.stderr += data.toString();
      });

      this.proc.on('message', data => {
        this.emit('message', data);
        console.log('>>> message', data.toString());
      });

      this.proc.on('close', code => {
        this.emit('close', code);
        console.log('close', code);
      });

      // const res = await Promise.race([
      //   // pEvent(this, 'message'),
      //   this.proc,
      // ]);

      // if (res.command) {
      //   ctx.res = res;
      //   ctx.result = {
      //     ...ctx.result,
      //     stdout: res.stdout,
      //     stderr: res.stderr,
      //     code: res.exitCode,
      //   };
      // }

      // console.log(this.proc)

      // pEvent

      // TODO: message could be obj
      // TODO: await event: ready, unready, timeout
      // const res = await this.proc;
      // ctx.res = res;
      // ctx.result = {
      //   ...ctx.result,
      //   stdout: res.stdout,
      //   stderr: res.stderr,
      //   code: res.exitCode,
      // };

      // this.logger.info('result: %j', res);

      // after runing
      for (const fn of this._runningChains) {
        await fn(ctx);
      }

      // after exit
      const res = await this.proc;
      ctx.res = res;
      ctx.result = {
        ...ctx.result,
        stdout: res.stdout,
        stderr: res.stderr,
        code: res.exitCode,
      };

      for (const fn of this._afterChains) {
        await fn(ctx);
      }

      // rethrow error after all assertion
      if (ctx.res.failed) throw ctx.res;

      // {
      //   command: '/Users/tz/.nvs/node/14.17.0/x64/bin/node ./simple.js --name=test',
      //   escapedCommand: '"/Users/tz/.nvs/node/14.17.0/x64/bin/node" "./simple.js" "--name=test"',
      //   exitCode: 0,
      //   stdout: 'this is simple bin~\n' +
      //     'argv: ["/Users/tz/.nvs/node/14.17.0/x64/bin/node","/Users/tz/Workspaces/coding/github.com/node-modules/btr/test/fixtures/simple.js","--name=test"]',
      //   stderr: '',
      //   all: undefined,
      //   failed: false,
      //   timedOut: false,
      //   isCanceled: false,
      //   killed: false
      // }

      // } catch (err) {
      //   ctx.error = err;
      //   console.error(err);
      // }
      return this;
    });
  }
}

export { TestRunner };
export default opts => new TestRunner(opts);
