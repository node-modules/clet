import { compose } from 'throwback';
import execa from 'execa';
import * as assertions from './assertion';
import logger from './logger';

class TestRunner {
  constructor(opts) {
    this.options = opts || {};

    // TODO: new a logger for clone
    this.logger = logger;
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

  register(plugins) {
    Object.assign(this, plugins);
  }

  cwd(dir) {
    this.cmdOpts.cwd = dir;
    return this;
  }

  run(cmd, args, opts) {
    this.cmd = cmd;
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
      await fn(ctx);
      return next();
    });
    return this;
  }

  end() {
    const cleanup = async (ctx, next) => {
      try {
        await next();
      } catch (err) {
        // kill cli if still alive
        this.logger.error(err);
        // TODO: rethrow error or assert code ?
      }
    };

    const fn = compose([ cleanup, ...this.chains, ...this.assertions ]);

    // TODO: clone this.ctx
    const context = {
      runner: this,
      logger: this.logger,
      ...this.ctx,
    };

    return fn(context, async ctx => {
      // run cli
      console.log('run', this.cmd, this.cmdArgs, this.cmdOpts);

      // try {
      // TODO: check cli, extend env
      // TODO: support ls ./
      this.proc = execa.node(this.cmd, this.cmdArgs, this.cmdOpts);

      // TODO: await event
      const result = await this.proc;
      ctx.result = result;
      console.log(result);

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
