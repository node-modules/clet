import { compose } from 'throwback';
import execa from 'execa';
import * as assertions from './assertion';
import assert from './assert-extend';
import logger from './logger';

class TestRunner {
  constructor(opts) {
    this.options = opts || {};

    // TODO: new a logger for clone
    this.logger = logger;
    this.assert = assert;
    this.ctx = {};

    this.chains = [];
    this.assertions = [];
    this.cmd = undefined;
    this.cmdArgs = undefined;
    this.cmdOpts = {};

    this.proc = undefined;

    this.register(assertions);
  }

  middleware(fn) {
    this.chains.push(fn);
    return this;
  }

  register(fn) {
    if (typeof fn === 'function') {
      fn(this);
    } else {
      Object.assign(this, fn);
    }
  }

  cwd(dir) {
    this.cmdOpts.cwd = dir;
    return this;
  }

  fork(cmd, args, opts) {
    return this._run('fork', cmd, args, opts);
  }

  spawn(cmd, args, opts) {
    return this._run('spawn', cmd, args, opts);
  }

  _run(type, cmd, args, opts) {
    this.cmd = cmd;
    this.cmdType = type;
    this.cmdArgs = args;
    this.cmdOpts = { ...this.cmdOpts, ...opts };
    return this;
  }

  expect(fn) {
    this._addAssertion(fn);
    return this;
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
      } finally {
        // kill cli if still alive
        this.logger.info('clean up');
        // TODO: rethrow error or assert code ?
      }
    };

    const fn = compose([ cleanup, ...this.chains, ...this.assertions ]);

    // TODO: clone this.ctx
    const context = {
      runner: this,
      logger: this.logger,
      assert: this.assert,
      ...this.ctx,
    };

    return fn(context, async ctx => {
      // run cli
      this.logger.info('execCommand:', this.cmdType, this.cmd, this.cmdArgs, this.cmdOpts);

      // try {
      // TODO: check cli, extend env
      // TODO: support ls ./
      const execCommand = this.cmdType === 'fork' ? execa.node : execa;
      this.proc = execCommand(this.cmd, this.cmdArgs, this.cmdOpts);

      // TODO: await event: ready, unready, timeout
      const res = await this.proc;
      ctx.result = {
        stdout: res.stdout,
        stderr: res.stderr,
        code: res.exitCode,
      };

      this.logger.info('result:', res);

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
      return ctx;
    });
  }
}

export { TestRunner };
export default opts => new TestRunner(opts);
