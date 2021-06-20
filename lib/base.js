
import EventEmitter from 'events';

import { compose } from 'throwback';

import logger from './logger';
class BaseSDK extends EventEmitter {
  constructor(opts) {
    super();
    this.options = opts || {};
    this.logger = logger;
    this.ctx = {
      instance: this,
      logger: this.logger,
    };
    this.middlewares = [];
    if (this.options.plugins) {
      this.register(...this.options.plugins);
    }
  }

  middleware(fn) {
    // TODO: detect `function.length` and provide a suger method?
    this.middlewares.push(fn);
    return this;
  }

  debug(level) {
    console.log(level);
  }

  // TODO: refactor plugin system, add init lifecyle
  register(...plugins) {
    for (const fn of plugins) {
      if (typeof fn === 'function') {
        fn(this);
      } else {
        for (const key of Object.keys(fn)) {
          this[key] = fn[key];
        }
      }
    }
    return this;
  }

  _launchChains(middlewares, handler) {
    const fn = compose(middlewares);
    return fn(this.ctx, handler).then(() => {
      // ensure chain return instance
      this.logger.success('Test pass.\n');
      return this;
    });
  }
}

export default BaseSDK;
