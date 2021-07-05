import { EOL } from 'os';
import EventEmitter from 'events';
import execa from 'execa';
import stripAnsi from 'strip-ansi';
import stripFinalNewline from 'strip-final-newline';
import pEvent from 'p-event';
import { compose } from 'throwback';

import * as utils from './utils.js';
import { assert } from './assert.js';
import { Logger, LogLevel } from './logger.js';
import * as validatorPlugin from './validator.js';
import * as operationPlugin from './operation.js';

class TestRunner extends EventEmitter {
  constructor(opts) {
    super();
    this.options = {
      autoWait: true,
      ...opts,
    };

    this.assert = assert;
    this.utils = utils;
    this.logger = new Logger({ tag: 'CLET' });
    this.childLogger = this.logger.child('PROC', { indent: 4, showTag: false });

    // middleware.pre -> before -> fork -> running -> after -> end -> middleware.post -> cleanup
    this.middlewares = [];
    this._chains = {
      before: [],
      running: [],
      after: [],
      end: [],
    };
    this._expectedExitCode = undefined;

    this.proc = undefined;

    /** @type {Context} */
    this.ctx = this._initContext();

    this.register(validatorPlugin);
    this.register(operationPlugin);
    this.register(this.options.plugins);
  }

  /**
   * @typedef Context
   *
   * @property {Object} result - child process execute result
   * @property {String} result.stdout - child process stdout
   * @property {String} result.stderr - child process stderr
   * @property {Number} result.code - child process exit code
   *
   * @property {execa.ExecaChildProcess} proc - child process instance
   * @property {TestRunner} instance - runner instance
   * @property {String} cwd - child process current workspace directory
   *
   * @property {Object} assert - assert helper
   * @property {Object} utils -  utils helper
   * @property {Object} logger - built-in logger
   */

  /**
   * init context
   *
   * @return {Context} context object
   * @private
   */
  _initContext() {
    const ctx = {
      instance: this,
      logger: this.logger,
      assert: this.assert,
      utils: this.utils,

      // commander
      cmd: undefined,
      cmdType: undefined,
      cmdArgs: undefined,
      cmdOpts: {
        reject: false,
        cwd: process.cwd(),
        env: {},
        preferLocal: true,
        // left these to use default
        // timeout: 0,
        // execArgv: process.execArgv,
        // extendEnv: true,
      },

      get cwd() { return ctx.cmdOpts.cwd; },
      get env() { return ctx.cmdOpts.env; },
      get proc() { return ctx.instance.proc; },

      result: {
        stdout: '',
        stderr: '',
        code: undefined,
        stopped: undefined,
      },
    };
    return ctx;
  }

  debug(level = 'DEBUG') {
    this.logger.level = level;
    this.childLogger.level = level;
    return this;
  }

  // TODO: refactor plugin system, add init lifecyle
  register(plugins) {
    if (!plugins) return this;
    if (!Array.isArray(plugins)) plugins = [ plugins ];
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

  use(fn) {
    this.middlewares.push(fn);
    return this;
  }

  /** @typedef {'before'|'running'|'after'|'end'} ChainType  */

  /**
   * add a function to chain
   *
   * @param {Function} fn - chain function
   * @param {ChainType} [type] - which chain to add
   * @return {TestRunner} instance for chain
   * @protected
   */
  _addChain(fn, type) {
    if (!type) type = this.ctx.cmd ? 'after' : 'before';
    const chains = this._chains[type];
    assert(chains, `unexpected chain type ${type}`);
    chains.push(fn);
    return this;
  }

  /**
   * run a chain
   *
   * @param {ChainType} type - which chain to run
   * @private
   */
  async _runChain(type) {
    const chains = this._chains[type];
    assert(chains, `unexpected chain type ${type}`);
    for (const fn of chains) {
      this.logger.debug('run %s chain fn:', type, fn.name);
      await fn.call(this, this.ctx);
    }
  }

  // Perform the test, optional, when you await and `end()` could be omit.
  end() {
    // clean up
    this.middlewares.unshift(async function cleanup(ctx, next) {
      try {
        await next();
        ctx.logger.info('✔ Test pass.\n');
        // ensure it will return context
        return ctx;
      } catch (err) {
        ctx.logger.error('⚠ Test failed.\n');
        throw err;
      } finally {
        // kill proc if still alive, when assert fail with long-run server, it will reach here
        if (ctx.proc && !ctx.result.stopped) {
          ctx.logger.warn(`still alive, kill ${ctx.proc.pid}`);
          ctx.proc.kill();
          await ctx.proc;
        }
      }
    });

    // run chains
    const fn = compose(this.middlewares);
    return fn(this.ctx, async () => {
      // before running
      await this._runChain('before');

      // run command
      await this._execCommand();

      // running
      await this._runChain('running');

      // auto wait proc to exit, then assert, use for not-long-run command
      // othersize, need to call `.wait()` manually
      if (this.options.autoWait) {
        await this.proc;
      }

      // after running
      await this._runChain('after');

      // ensure proc is exit if user forgot to call `wait('end')` after wait other event
      await this.proc;

      // after exit
      await this._runChain('end');

      // if developer don't call `.code()`, will rethrow proc error in order to avoid omissions
      if (this._expectedExitCode === undefined) {
        // `killed` is true only if call `kill()/cancel()` manually
        const { failed, isCanceled, killed } = this.ctx.res;
        if (failed && !isCanceled && !killed) throw this.ctx.res;
      }

      return this.ctx;
    });
  }

  // suger method for `await runner().end()` -> `await runner()`
  then(resolve, reject) {
    return this.end().then(resolve, reject);
  }

  catch(fn) {
    return this.then(undefined, fn);
  }

  /**
   * execute a Node.js script as a child process.
   *
   * @param {String} cmd - cmd string
   * @param {Array} [args] - cmd args
   * @param {execa.NodeOptions} [opts] - cmd options
   * @see https://github.com/sindresorhus/execa#options
   * @return {TestRunner} instance for chain
   */
  fork(cmd, args, opts) {
    return this._registerCommand('fork', cmd, args, opts);
  }

  /**
    * execute a shell script as a child process.
    *
    * @param {String} cmd - cmd string
    * @param {Array} [args] - cmd args
    * @param {execa.NodeOptions} [opts] - cmd options
    * @return {TestRunner} runner instance
    */
  spawn(cmd, args, opts) {
    assert(cmd, 'cmd is required');
    return this._registerCommand('spawn', cmd, args, opts);
  }

  _registerCommand(cmdType, cmd, cmdArgs, cmdOpts = {}) {
    assert(cmd, 'cmd is required');
    assert(!this.ctx.cmd, 'cmd had registered');

    // fork(cmd, cmdOpts)
    if (cmdArgs && !Array.isArray(cmdArgs)) {
      cmdOpts = cmdArgs;
      cmdArgs = undefined;
    }

    // alias
    if (cmdOpts.execArgv) {
      cmdOpts.nodeOptions = cmdOpts.nodeOptions || cmdOpts.execArgv;
      delete cmdOpts.execArgv;
    }

    // merge opts and env
    cmdOpts.env = { ...this.ctx.cmdOpts.env, ...cmdOpts.env };
    Object.assign(this.ctx.cmdOpts, cmdOpts);
    Object.assign(this.ctx, { cmd, cmdType, cmdArgs });

    return this;
  }

  async _execCommand() {
    const { cmd, cmdType, cmdArgs = [], cmdOpts } = this.ctx;
    assert(cmd, 'cmd is required');
    assert(await utils.exists(cmdOpts.cwd), `cwd ${cmdOpts.cwd} is not exists`);

    if (cmdType === 'fork') {
      // TODO: check cmd is exists
      this.logger.info('Fork `%s` %j', cmd, cmdOpts);
      this.proc = execa.node(cmd, cmdArgs, cmdOpts);
    } else {
      const cmdString = [ cmd, ...cmdArgs ].join(' ');
      this.logger.info('Spawn `%s` %j', cmdString, cmdOpts);
      this.proc = execa.command(cmdString, cmdOpts);
    }

    // Notice: don't await it
    this.proc.then(res => {
      // { command, escapedCommand, exitCode, stdout, stderr, all, failed, timedOut, isCanceled, killed }
      this.ctx.res = res;
      const { result } = this.ctx;
      result.code = res.exitCode;
      result.stopped = true;
      if (res.failed && !res.isCanceled && !res.killed) {
        const msg = res.originalMessage ? `Command failed with: ${res.originalMessage}` : res.shortMessage;
        this.logger.warn(msg);
      }
    });

    this.proc.stdin.setEncoding('utf8');

    this.proc.stdout.on('data', data => {
      const origin = stripFinalNewline(data.toString());
      const content = stripAnsi(origin);
      this.ctx.result.stdout += content;
      this.emit('stdout', content);

      this.childLogger.info(origin);
    });

    this.proc.stderr.on('data', data => {
      const origin = stripFinalNewline(data.toString());
      const content = stripAnsi(origin);
      this.ctx.result.stderr += content;
      this.emit('stderr', content);

      // FIXME: when using `.error()`, error log will print before info, why??
      this.childLogger.info(origin);
    });

    this.proc.on('spawn', () => {
      this.emit('spawn', this);
    });

    this.proc.on('message', data => {
      this.emit('message', data);
      this.logger.debug('message event:', data);
    });

    this.proc.once('close', code => {
      this.emit('close', code);
      this.logger.debug('close event:', code);
    });

    // Notice: don't return proc otherwise it will be wait and resolve
    await utils.sleep(50);
  }

  /**
   * wait for event then resume the chains
   *
   * @param {String} type - message/stdout/stderr/close
   * @param {String|RegExp|Object|Function} expected - rule to validate
   *  - {String}: check whether includes specified string
   *  - {RegExp}: check whether match regexp
   *  - {Object}: check whether partial includes specified JSON
   *  - {Function}: check whether with specified function
   * @return {TestRunner} instance for chain
   */
  wait(type, expected) {
    this.options.autoWait = false;

    // watch immediately but await later in chains
    let promise;
    switch (type) {
      case 'message': {
        promise = pEvent(this, 'message', {
          rejectionEvents: [ 'close' ],
          filter: input => utils.validate(input, expected),
        });
        break;
      }

      case 'stdout':
      case 'stderr': {
        promise = pEvent(this, type, {
          rejectionEvents: [ 'close' ],
          filter: () => {
            return utils.validate(this.ctx.result[type], expected);
          },
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
    return this._addChain(async function wait() {
      try {
        await promise;
      } catch (err) {
        // don't treat close event as error as rejectionEvents
      }
    });
  }

  /**
   * Detect a prompt, then respond to it.
   *
   * could use `KEYS.UP` / `KEYS.DOWN` to respond to choices prompt.
   *
   * @param {String|RegExp} expected - test `stdout` with regexp match or string includes
   * @param {String|Array} respond - respond content, if set to array then write each with a delay.
   * @return {TestRunner} instance for chain
   */
  stdin(expected, respond) {
    assert(expected, '`expected is required');
    assert(respond, '`respond is required');

    this._addChain(async function stdin(ctx) {
      // check stdout
      const isPrompt = utils.validate(ctx.result.stdout.substring(ctx._lastPromptIndex), expected);
      if (!isPrompt) {
        try {
          await pEvent(ctx.instance, 'stdout', {
            rejectionEvents: [ 'close' ],
            filter: () => {
              return utils.validate(ctx.result.stdout.substring(ctx._lastPromptIndex), expected);
            },
          });
        } catch (err) {
          const msg = 'wait for prompt, but proccess is terminate with error';
          this.logger.error(msg);
          const error = new Error(msg);
          error.cause = err;
          throw error;
        }
      }

      // remember last index
      ctx._lastPromptIndex = ctx.result.stdout.length;

      // respond to stdin
      if (!Array.isArray(respond)) respond = [ respond ];
      for (const str of respond) {
        // FIXME: when stdin.write, stdout will recieve duplicate output
        // auto add \n
        ctx.proc.stdin.write(str.replace(/\r?\n$/, '') + EOL);
        await utils.sleep(100); // wait a second
      }
    }, 'running');
    return this;
  }

  /**
   * set working directory
   *
   * @param {String} dir - working directory
   * @param {Object} [opts] - options
   * @param {Boolean} [opts.init] - whether rm and mkdir dir before test
   * @param {Boolean} [opts.clean] - whether rm dir after test
   * @return {TestRunner} instance for chain
   */
  cwd(dir, opts = {}) {
    this.ctx.cmdOpts.cwd = dir;

    // auto init
    const { init, clean } = opts;
    if (init) {
      this.use(async function initCwd(ctx, next) {
        // if dir is parent of cmdPath and process.cwd(), should throw
        const { cmd, cmdType } = ctx;
        assert(cmd, 'cmd is required');
        assert(!utils.isParent(dir, process.cwd()), `rm ${dir} is too dangerous`);
        assert(cmdType === 'spawn' || (cmdType === 'fork' && !utils.isParent(dir, cmd)), `rm ${dir} is too dangerous`);

        await utils.rm(dir);
        await utils.mkdir(dir);
        try {
          await next();
        } finally {
          if (clean) await utils.rm(dir);
        }
      });
    }
    return this;
  }

  /**
   * set environment variables.
   *
   * @param {String} key - env key
   * @param {String} value - env value
   * @return {TestRunner} instance for chain
   */
  env(key, value) {
    this.ctx.cmdOpts.env[key] = value;
    return this;
  }

  /**
   * set a timeout, will kill SIGTERM then SIGKILL.
   *
   * @param {Number} ms - milliseconds
   * @return {TestRunner} instance for chain
   */
  timeout(ms) {
    this.ctx.cmdOpts.timeout = ms;
    return this;
  }

  /**
   * cancel the proc.
   *
   * useful for manually end long-run server after validate.
   *
   * when kill, exit code maybe undefined if user don't hook signal event.
   *
   * @see https://github.com/sindresorhus/execa#killsignal-options
   * @return {TestRunner} instance for chain
   */
  kill() {
    return this._addChain(async function kill(ctx) {
      ctx.proc.cancel();
      await ctx.proc;
    });
  }
}

export * from './constant.js';
export { TestRunner, LogLevel };

/**
 * create a runner
 * @param {Object} opts - options
 * @return {TestRunner} runner instance
 */
export function runner(opts) { return new TestRunner(opts); }
