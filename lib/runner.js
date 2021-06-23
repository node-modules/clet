import { EOL } from 'os';
import execa from 'execa';
import stripAnsi from 'strip-ansi';
import pEvent from 'p-event';
import pWaitFor from 'p-wait-for';

import BaseSDK from './base.js';
import * as utils from './utils.js';

import * as validatorPlugin from './validator.js';
import * as filePlugin from './file.js';
import * as operationPlugin from './operation.js';
import * as httpPlugin from './http.js';

const { assert } = utils;

class TestRunner extends BaseSDK {
  constructor(opts) {
    opts = {
      autoWait: true,
      ...opts,
    };
    super(opts);

    this.assert = utils.assert;

    // middleware.pre -> before -> fork -> runing -> after -> end -> midlleware.post -> cleanup
    this._beforeChains = [];
    this._runningChains = [];
    this._afterChains = [];
    this._endChains = [];
    this._promptList = [];
    this._expectedExitCode = undefined;

    this.proc = undefined;

    this._initContext();
    this.register(validatorPlugin);
    this.register(operationPlugin);
    this.register(filePlugin);
    this.register(httpPlugin);
  }

  /**
   * @typedef RunnerContext
   *
   * @property {String} result.stdout
   * @property {String} result.stderr
   * @property {Number} result.code
   */

  /**
   * init context
   * @private
   */
  _initContext() {
    this.ctx = {
      ...this.ctx,

      assert: this.assert,

      // commander
      cmd: undefined,
      cmdType: undefined,
      cmdArgs: undefined,
      cmdOpts: {
        reject: false,
        cwd: process.cwd(),
        env: {},
        // left these to use default
        // timeout: 0,
        // execArgv: process.execArgv,
        // extendEnv: true,
        // preferLocal: false,
      },

      get cwd() { return this.cmdOpts.cwd; },
      get env() { return this.cmdOpts.env; },
      get proc() { return this.instance.proc; },

      result: {
        stdout: '',
        stderr: '',
        code: undefined,
        stopped: undefined,
      },
    };
  }

  /**
   *
   * @param {Function} fn - x
   * @param {'before'|'running'|'after'|'end'} position - which chain to add
   * @return {TestRunner} instance for chain
   */
  _addChain(fn, position) {
    if (!position) position = this.ctx.cmd ? 'after' : 'before';

    assert([ 'before', 'running', 'after', 'end' ].includes(position), `unexpected position ${position}`);

    const chains = this[`_${position}Chains`];
    chains.push(fn);
    return this;
  }

  /**
   * perform the test.
   *
   * @return {TestRunner} instance for chain
   */
  end() {
    // TODO: move to then()
    // cleanup
    this.middlewares.unshift(async (ctx, next) => {
      try {
        await next();
      } finally {
        // kill proc if still alive, when assert fail with long-run server, it will reach here
        if (this.proc && !this.ctx.result.stopped) {
          this.logger.warn(`still alive, kill ${this.proc.pid}`);
          this.proc.kill();
          await this.proc;
        }
      }
    });

    const runChains = async (chains, ctx) => {
      for (const fn of chains) {
        // this.logger.info('run chain fn:', fn.name);
        await fn(ctx);
      }
    };

    return this._launchChains(this.middlewares, async ctx => {
      // before runing
      await runChains(this._beforeChains, ctx);

      // run command
      const proc = this._execCommand();

      // running
      await runChains(this._runningChains, ctx);

      // auto wait proc to exit, then assert, use for not-long-run command
      // othersize, need to call `.wait()` manually
      if (this.options.autoWait) {
        await proc;
      }

      // after running
      await runChains(this._afterChains, ctx);

      // ensure proc is exit if user forgot to call `wait('end')` after wait other event
      await proc;

      // after exit
      await runChains(this._endChains, ctx);

      // if developer don't call `.code()`, will rethrow proc error in order to avoid omissions
      if (this._expectedExitCode === undefined) {
        // `killed` is true only if call `kill()/cancel()` manually
        const { failed, isCanceled, killed } = ctx.res;
        if (failed && !isCanceled && !killed) throw ctx.res;
      }

      return this;
    });
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
    * @memberof Runner
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

  _execCommand() {
    const { cmd, cmdType, cmdArgs = [], cmdOpts } = this.ctx;
    assert(cmd, 'cmd is required');

    if (cmdType === 'fork') {
      // TODO: check cmd is exists
      this.logger.info('fork %s %j', cmd, cmdOpts);
      this.proc = execa.node(cmd, cmdArgs, cmdOpts);
    } else {
      const cmdString = [ cmd, ...cmdArgs ].join(' ');
      this.logger.info('spawn %s %j', cmdString, cmdOpts);
      this.proc = execa.command(cmdString, cmdOpts);
    }

    this.proc.then(res => {
      // { command, escapedCommand, exitCode, stdout, stderr, all, failed, timedOut, isCanceled, killed }
      this.ctx.res = res;
      this.ctx.result.code = res.exitCode;
      this.ctx.result.stopped = true;
    });

    function log(logFn, content) {
      const arr = content.split(EOL);
      for (const str of arr) {
        logFn('  ' + str);
      }
    }

    this.proc.stdin.setEncoding('utf8');

    this.proc.stdout.on('data', data => {
      const content = stripAnsi(data.toString());
      this.ctx.result.stdout += content;
      log(this.logger.log, content);
      this.emit('stdout', content);
    });

    this.proc.stderr.on('data', data => {
      const content = stripAnsi(data.toString());
      this.ctx.result.stderr += content;
      // TODO: write to error
      log(this.logger.log, content);
      this.emit('stderr', content);
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

    // TODO: enable by debug() and indent
    // this.proc.stdout.pipe(process.stdout);
    // this.proc.stderr.pipe(process.stderr);

    return this.proc;
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
    return this._addChain(async () => {
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

    this._addChain(async ({ result }) => {
      // check stdout
      await pWaitFor(() => {
        assert(!result.stopped, 'wait for prompt, but proccess is terminate.');
        return utils.validate(result.stdout.substring(this._lastPromptIndex), expected);
      }, { before: true, interval: 300 });

      // remember last index
      this._lastPromptIndex = result.stdout.length;

      // respond to stdin
      if (!Array.isArray(respond)) respond = [ respond ];
      for (const str of respond) {
        // FIXME: when stdin.write, stdout will recieve duplicative output
        this.proc.stdin.write(str);
        await utils.sleep(100); // wait a second
      }
    }, 'running');
    return this;
  }

  /**
   * set working directory
   *
   * @param {String} dir - working directory
   * @return {TestRunner} instance for chain
   */
  cwd(dir) {
    this.ctx.cmdOpts.cwd = dir;
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
   * @param {String} signal - signal event name
   * @param {Object} [options] - { forceKillAfterTimeout }
   * @see https://github.com/sindresorhus/execa#killsignal-options
   * @return {TestRunner} instance for chain
   */
  kill(signal, options) {
    return this._addChain(async () => {
      this.proc.cancel(signal, options);
      await this.proc;
    });
  }
}

export * from './constant.js';
export { TestRunner };
export default opts => new TestRunner(opts);
