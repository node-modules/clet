import { compose } from 'throwback';
import execa from 'execa';
import pEvent from 'p-event';
import dotProp from 'dot-prop';
import * as assertion from './assertion/index';
import * as operation from './operation';
import assert from './assert-extend';
import logger from './logger';

class TestRunner {
  constructor(opts) {
    this.options = {
      extendEnv: true,
      ...opts,
    };

    // TODO: new a logger for clone
    this.logger = logger;
    this.assert = assert;

    // chain
    this.ctx = {
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
      },
    };

    this.middlewares = [];
    this.chains = [];
    this.assertions = [];

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
    this.chains.push(ctx => {
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

  _registerCommand(type, cmd, args, opts) {
    this.ctx.cmd = cmd;
    this.ctx.cmdType = type;
    this.ctx.cmdArgs = args;
    this.ctx.cmdOpts = { ...this.ctx.cmdOpts, ...opts };
    // this.cmdOpts.env = { ...this.cmdOpts && this.cmdOpts.env, ... opts && opts.env };
    // this.cmdOpts = { ...this.cmdOpts, ...opts };
    return this;
  }

  // _addAssertion(fn) {
  //   this.assertions.push(async (ctx, next) => {
  //     await next();
  //     await fn(ctx);
  //   });
  //   return this;
  // }

  // _addOperation(fn) {
  //   this.chains.push(fn);
  //   return this;
  // }

  // _addChain(fn) {
  //   const chains = this.cmd ? this.afterChains : this.beforeChains;
  //   chains.push(fn);
  //   return this;
  // }

  end() {
    const cleanup = async (ctx, next) => {
      try {
        await next();

        // rethrow error
        if (ctx.res.failed) throw ctx.res;

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
      const { cmdType, cmd, cmdArgs, env, cwd } = ctx;
      const cmdOpts = {
        ...ctx.cmdOpts,
        env,
        cwd,
      };

      // run cli
      this.logger.info('execCommand: %s(%s %s %j)', cmdType, cmd, cmdArgs || '', cmdOpts);

      // try {
      // TODO: check cli
      const execCommand = { fork: execa.node, spawn: execa }[cmdType];

      this.proc = execCommand(cmd, cmdArgs, cmdOpts);
      this.started = true;

      this.proc.stdout.on('data', data => {
        console.log('> data:', data.toString());
      });

      // console.log(this.proc)

      // pEvent

      // TODO: await event: ready, unready, timeout
      const res = await this.proc;
      ctx.res = res;
      ctx.result = {
        stdout: res.stdout,
        stderr: res.stderr,
        code: res.exitCode,
      };

      this.logger.info('result: %j', res);

      for (const fn of this.chains) {
        await fn(this.ctx);
      }

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
