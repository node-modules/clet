import { compose } from 'throwback';
import execa from 'execa';
import pEvent from 'p-event';
import * as assertions from './assertion';
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
    this.ctx = {
      runner: this,
      logger: this.logger,
      assert: this.assert,
    };

    this.chains = [];
    this.assertions = [];
    this.cmd = undefined;
    this.cmdArgs = undefined;
    this.cmdOpts = {
      extendEnv: this.options.extendEnv,
    };

    this.proc = undefined;

    this.register(assertions);
    this.register(this.options.plugins);
  }

  middleware(fn) {
    this.chains.push(fn);
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
    this.cmdOpts.cwd = dir;
    return this;
  }

  // override opts.env
  env(key, value) {
    // assert should before fork
    this.cmdOpts.env[key] = value;
    return this;
  }

  fork(cmd, args, opts) {
    return this._registerCommand('fork', cmd, args, opts);
  }

  spawn(cmd, args, opts) {
    return this._registerCommand('spawn', cmd, args, opts);
  }

  exec(cmd, opts) {
    return this._registerCommand('exec', cmd, undefined, opts);
  }

  _registerCommand(type, cmd, args, opts) {
    this.cmd = cmd;
    this.cmdType = type;
    this.cmdArgs = args;
    this.cmdOpts.env = { ...this.cmdOpts.env, ... opts && opts.env };
    this.cmdOpts = { ...this.cmdOpts, ...opts };
    return this;
  }

  expect(fn) {
    return this._addAssertion(fn);
  }

  _addAssertion(fn) {
    this.assertions.push(async (ctx, next) => {
      await next();
      await fn(ctx);
    });
    return this;
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
        // TODO: rethrow error or assert code ?
      }
    };

    const fn = compose([ cleanup, ...this.chains, ...this.assertions ]);

    // TODO: ~~clone this.ctx~~
    return fn(this.ctx, async ctx => {
      // run cli
      this.logger.info('execCommand:', this.cmdType, this.cmd, this.cmdArgs, this.cmdOpts);

      // try {
      // TODO: check cli
      const execCommand = { fork: execa.node, spawn: execa, exec: execa.command }[this.cmdType];

      this.proc = execCommand(this.cmd, this.cmdArgs, this.cmdOpts);

      this.proc.stdout.on('data', data => {
        console.log('> data:', data.toString());
      });

      // pEvent

      // TODO: await event: ready, unready, timeout
      const res = await this.proc;
      ctx.result = {
        stdout: res.stdout,
        stderr: res.stderr,
        code: res.exitCode,
      };

      this.logger.info('result: %j', res);

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
