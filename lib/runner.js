import { compose } from 'throwback';
import * as assertions from './assertion';

class TestRunner {
  constructor(opts) {
    this.options = opts || {};

    this.ctx = { runner: this };
    this.chains = [];
    this.assertions = [];
    this.cli = undefined;
    this.cliOpts = undefined;

    this.register(assertions);
  }

  middleware(fn) {
    this.chains.push(fn);
    return this;
  }

  register(plugins) {
    Object.assign(this, plugins);
  }

  run(cmd) {
    this.cli = cmd;
    return this;
  }

  expect(fn) {
    this.assertions.push(async (ctx, next) => {
      await fn(ctx);
      return next();
    });
    return this;
  }

  end() {
    const fn = compose([ ...this.chains, ...this.assertions ]);
    return fn(this.ctx, ctx => {
      // run cli
      console.log('run', this.cli);
      return ctx;
    });
  }
}

export { TestRunner };
export default opts => new TestRunner(opts);
