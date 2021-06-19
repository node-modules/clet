import { compose } from 'throwback';
import execa from 'execa';
import dotProp from 'dot-prop';
import EventEmitter from 'events';
import pEvent from 'p-event';
import stripAnsi from 'strip-ansi';
import debounce from 'lodash.debounce';

import * as assertion from './assertion/index';
import * as operation from './operation';
import * as utils from './utils';
import assert from './assert-extend';
import logger from './logger';

class TestRunner extends EventEmitter {
  constructor(opts) {
    super();
    this.options = {
      autoWait: true,
      ...opts,
    };

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
        timeout: 0,
        get cwd() { return ctx.cwd; },
        get env() { return ctx.env; },
      },
      cmdScripts: [],

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
    this._promptList = [];

    this.proc = undefined;

    this.register(assertion);
    this.register(operation);
    this.register(this.options.plugins);
    this._hookEvent();
  }

  middleware(fn) {
    // TODO: function.length?
    this.middlewares.push(fn);
    return this;
  }

  debug(level) {
    console.log(level);
  }

  log(format, ...keys) {
    this._addChain(ctx => {
      if (keys.length === 0) {
        this.logger.info(dotProp.get(ctx, format) || format);
      } else {
        this.logger.info(format, keys.map(k => dotProp.get(ctx, k)));
      }
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

  beforeScript(filePath) {
    // FIXME: not support at ESM
    this.cmdScripts.push(filePath);
    return this;
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

    // support beforeScript
    if (this.ctx.cmdScripts.length > 0) {
      const nodeOptions = cmdOpts.nodeOptions ? [ ...cmdOpts.nodeOptions ] : [ ...process.execArgv ];
      for (const filePath of this.ctx.cmdScripts) {
        nodeOptions.push('-r', filePath);
      }
      this.ctx.cmdOpts = nodeOptions;
    }

    return this;
  }

  _addChain(fn) {
    const chains = this.ctx.cmd ? this._runningChains : this._prepareChains;
    chains.push(fn);
    return this;
  }

  stdin(expected, respond) {
    this._promptList.push({
      match: utils.makeCheckFn(expected),
      respond,
    });
    return this;
  }

  wait(type, expected) {
    this.options.autoWait = false;
    let promise;

    // watch immediately but await later in chains
    switch (type) {
      case 'message': {
        const filterFn = utils.makeCheckFn(expected);

        promise = pEvent(this, 'message', {
          rejectionEvents: [ 'close' ],
          filter: filterFn,
        });
        break;
      }

      case 'stdout': {
        const filterFn = utils.makeCheckFn(expected);
        promise = pEvent(this, 'stdout', {
          rejectionEvents: [ 'close' ],
          filter: () => filterFn(this.ctx.result.stdout),
        });
        break;
      }

      case 'close':
      default: {
        promise = pEvent(this, 'close');
        break;
      }
    }

    // await later in chains
    return this._addChain(async () => {
      try {
        await promise;
      } catch (err) {
        // don't treat close event as error as rejectionEvents
      }
    });
  }

  _execCommand() {
    const { cmdType, cmd, cmdArgs, cmdOpts } = this.ctx;
    this.logger.info('execCommand: %s(%s %s %j)', cmdType, cmd, cmdArgs || '', cmdOpts);
    assert(cmd, 'cmd is required');

    const execCommand = { fork: execa.node, spawn: execa }[cmdType];

    this.proc = execCommand(cmd, cmdArgs, cmdOpts);
    this.proc.then(res => {
      // { command, escapedCommand, exitCode, stdout, stderr, all, failed, timedOut, isCanceled, killed }
      this.ctx.res = res;
      this.ctx.result.code = res.exitCode;
    });

    this.proc.stdout.on('data', data => {
      const content = stripAnsi(data.toString());
      this.ctx.result.stdout += content;
      this.emit('stdout', content);
    });

    this.proc.stdin.setEncoding('utf8');

    this.proc.stderr.on('data', data => {
      const content = stripAnsi(data.toString());
      this.ctx.result.stderr += content;
      this.emit('stderr', content);
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

  _hookEvent() {
    this.on('stdout', debounce(() => {
      for (const [ index, item ] of this._promptList.entries()) {
        const { match, respond } = item;
        if (match(this.ctx.result.stdout)) {
          // FIXME: when stdin.write, stdout will recieve duplicative output
          this.proc.stdin.write(respond);
          this._promptList.splice(index, 1);
          if (this._promptList.length === 0) this.proc.stdin.end();
          break;
        }
      }
    }, 200));
  }

  end() {
    const cleanup = async (ctx, next) => {
      try {
        await next();
        // ensure chain return instance
        return this;
      } finally {
        // kill cli if still alive
        this.logger.success('Test pass.');
      }
    };

    const fn = compose([ cleanup, ...this.middlewares ]);

    return fn(this.ctx, async ctx => {
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

      // wait for exit if user don't call `wait()`
      await proc;

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
