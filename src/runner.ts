import { EOL } from 'os';
import EventEmitter from 'events';
import execa from 'execa';
import stripAnsi from 'strip-ansi';
import stripFinalNewline from 'strip-final-newline';
import pEvent from 'p-event';
import { compose } from 'throwback';
import { Promisable } from 'type-fest';
import * as utils from './utils.js';
import { assert } from './assert.js';
import { Logger } from './logger.js';
import { ValidatorPlugin } from './validator.js';
import { OperationPlugin } from './operation.js';
import { ValidateExpected } from './utils.js';

export enum ChainType {
  AFTER = 'after',
  BEFORE = 'before',
  RUNNING = 'running',
  END = 'end',
}

export enum WaitType {
  message = 'message',
  stdout = 'stdout',
  stderr = 'stderr',
  close = 'close',
}

export interface TestRunnerContext {
  instance: Runner;
  logger: Logger;
  assert: typeof assert;
  utils: typeof utils;
  cmd?: string;
  cmdType?: 'fork' | 'spawn';
  cmdArgs?: string[];
  lastPromptIndex?: number;
  cmdOpts: {
    reject: boolean;
    cwd: string;
    env: Record<string, string>;
    preferLocal: boolean;
    timeout?: number;
  },
  cwd: string;
  env: Record<string, string>;
  proc?: execa.ExecaChildProcess;
  res?: execa.ExecaReturnValue;
  result: {
    stdout: string;
    stderr: string;
    code?: number;
    stopped?: boolean;
  },
}

export type FunctionPlugin = (runner: Runner) => void;
export type ObjectPlugin = Record<string, any>;
export type Plugin = FunctionPlugin | ObjectPlugin;
export type TestRunnerMiddleware = (ctx: TestRunnerContext, next: any) => Promise<void> | void;
export type TestRunnerChainFunction = (this: Runner, ctx: TestRunnerContext) => Promise<void> | void;

export interface TestRunnerChain {
  before: TestRunnerChainFunction[],
  running: TestRunnerChainFunction[],
  after: TestRunnerChainFunction[],
  end: TestRunnerChainFunction[],
}

export class RunnerError extends Error {
  readonly cause: Error;

  constructor(msg: string, cause: Error) {
    super(msg);
    this.cause = cause;
  }
}

class Runner extends EventEmitter implements Promisable<any> {
  private readonly chains: TestRunnerChain;
  private proc?: execa.ExecaChildProcess;
  expectedExitCode?: number | ((number) => void);

  readonly options: {
    autoWait: boolean;
    plugins: [];
  };
  readonly assert: typeof assert = assert;
  readonly utils = utils;
  readonly logger: Logger;
  readonly childLogger: Logger;
  readonly middlewares: TestRunnerMiddleware[];
  readonly ctx: TestRunnerContext;

  constructor(opts) {
    super();
    this.options = {
      autoWait: true,
      ...opts,
    };
    this.logger = new Logger('CLET');
    this.childLogger = this.logger.child('PROC', { indent: 4, showTag: false });

    // middleware.pre -> before -> fork -> running -> after -> end -> middleware.post -> cleanup
    this.middlewares = [];
    this.chains = {
      before: [],
      running: [],
      after: [],
      end: [],
    };
    this.expectedExitCode = undefined;

    this.proc = undefined;

    this.ctx = this.initContext();

    this.register(ValidatorPlugin);
    this.register(OperationPlugin);
    this.register(this.options.plugins);
  }

  /**
   * @typedef Context
   *
   * @property {Object} result - child process execute result
   * @property {string} result.stdout - child process stdout
   * @property {string} result.stderr - child process stderr
   * @property {Number} result.code - child process exit code
   *
   * @property {execa.ExecaChildProcess} proc - child process instance
   * @property {Runner} instance - runner instance
   * @property {string} cwd - child process current workspace directory
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
  private initContext(): TestRunnerContext {
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

      get cwd() {
        return ctx.cmdOpts.cwd;
      },
      get env() {
        return ctx.cmdOpts.env;
      },
      get proc() {
        return ctx.instance.proc;
      },

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
  register(plugins?: Plugin | Plugin[]) {
    if (!plugins) return this;
    if (!Array.isArray(plugins)) plugins = [ plugins ];
    for (const fn of plugins as Plugin[]) {
      if (utils.types.isClass(fn)) {
        // https://www.typescriptlang.org/docs/handbook/mixins.html#alternative-pattern
        Object.getOwnPropertyNames(fn.prototype).forEach(name => {
          Object.defineProperty(
            Runner.prototype,
            name,
            Object.getOwnPropertyDescriptor(fn.prototype, name) ||
            Object.create(null),
          );
        });
      } else if (typeof fn === 'function') {
        fn(this);
      } else {
        for (const key of Object.keys(fn)) {
          this[key] = fn[key];
        }
      }
    }
    return this;
  }

  use(fn: TestRunnerMiddleware) {
    this.middlewares.push(fn);
    return this;
  }

  /** @typedef {'before'|'running'|'after'|'end'} ChainType  */

  /**
   * add a function to chain
   *
   * @param {Function} fn - chain function
   * @param {ChainType} [type] - which chain to add
   * @return {Runner} instance for chain
   * @protected
   */
  addChain(fn: TestRunnerChainFunction, type?: ChainType): this {
    if (!type) type = this.ctx.cmd ? ChainType.AFTER : ChainType.BEFORE;
    const chains = this.chains[type];
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
  async runChain(type: ChainType) {
    const chains = this.chains[type];
    assert(chains, `unexpected chain type ${type}`);
    for (const fn of chains) {
      this.logger.debug('run %s chain fn:', type, fn.name);
      await fn.call(this, this.ctx);
    }
  }

  // Perform the test, optional, when you await and `end()` could be omit.
  async end(): Promise<TestRunnerContext> {
    // clean up
    this.middlewares.unshift(async function cleanup(ctx, next) {
      try {
        await next();
        ctx.logger.info('✔ Test pass.\n');
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
    await fn(this.ctx, async () => {
      // before running
      await this.runChain(ChainType.BEFORE);

      // run command
      await this.execCommand();

      // running
      await this.runChain(ChainType.RUNNING);

      // auto wait proc to exit, then assert, use for not-long-run command
      // othersize, need to call `.wait()` manually
      if (this.options.autoWait) {
        await this.proc;
      }

      // after running
      await this.runChain(ChainType.AFTER);

      // ensure proc is exit if user forgot to call `wait('end')` after wait other event
      await this.proc;

      // after exit
      await this.runChain(ChainType.END);

      // if developer don't call `.code()`, will rethrow proc error in order to avoid omissions
      if (this.expectedExitCode === undefined) {
        // `killed` is true only if call `kill()/cancel()` manually
        const { failed, isCanceled, killed } = this.ctx.res!;
        if (failed && !isCanceled && !killed) throw this.ctx.res;
      }
    });
    return this.ctx;
  }

  // suger method for `await runner().end()` -> `await runner()`
  then(resolve: ((value: TestRunnerContext) => PromiseLike<void>) | undefined,
    reject: ((reason: string | Error) => PromiseLike<void>)): Promise<void> {
    return this.end().then(resolve, reject);
  }

  catch(fn) {
    return this.then(undefined, fn);
  }

  /**
   * execute a Node.js script as a child process.
   *
   * @param {string} cmd - cmd string
   * @param {Array} [args] - cmd args
   * @param {execa.NodeOptions} [opts] - cmd options
   * @see https://github.com/sindresorhus/execa#options
   * @return {Runner} instance for chain
   */
  fork(cmd, args?, opts?) {
    return this.registerCommand('fork', cmd, args, opts);
  }

  /**
   * execute a shell script as a child process.
   *
   * @param {string} cmd - cmd string
   * @param {Array} [args] - cmd args
   * @param {execa.NodeOptions} [opts] - cmd options
   * @return {Runner} runner instance
   */
  spawn(cmd, args?, opts?) {
    assert(cmd, 'cmd is required');
    return this.registerCommand('spawn', cmd, args, opts);
  }

  private registerCommand(cmdType: 'fork' | 'spawn', cmd: string, cmdArgs: Array<string> | undefined, cmdOpts: {
    reject?: boolean;
    cwd?: string;
    env?: Record<string, string>;
    preferLocal?: boolean;
    nodeOptions?: string[];
    execArgv?: string[];
  } = {}): this {
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

  private async execCommand() {
    const { cmd, cmdType, cmdArgs = [], cmdOpts } = this.ctx;
    assert(cmd, 'cmd is required');
    assert(await utils.exists(cmdOpts.cwd), `cwd ${cmdOpts.cwd} is not exists`);

    if (cmdType === 'fork') {
      // TODO: check cmd is exists
      this.logger.info('Fork `%s` %j', cmd, cmdOpts);
      this.proc = execa.node(cmd!, cmdArgs, cmdOpts);
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
        const errorRes = (res as unknown as execa.ExecaSyncError);
        const msg = errorRes.originalMessage ? `Command failed with: ${errorRes.originalMessage}` : errorRes.shortMessage;
        this.logger.warn(msg);
      }
    });

    this.proc!.stdout!.on('data', data => {
      const origin = stripFinalNewline(data.toString());
      const content = stripAnsi(origin);
      this.ctx.result.stdout += content;
      this.emit('stdout', content);

      this.childLogger.info(origin);
    });

    this.proc!.stderr!.on('data', data => {
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
   * @param {string} type - message/stdout/stderr/close
   * @param {String|RegExp|Object|Function} expected - rule to validate
   *  - {string}: check whether includes specified string
   *  - {RegExp}: check whether match regexp
   *  - {Object}: check whether partial includes specified JSON
   *  - {Function}: check whether with specified function
   * @return {Runner} instance for chain
   */
  wait(type?: WaitType, expected?: ValidateExpected): this {
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
    return this.addChain(async function wait() {
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
   * @return {Runner} instance for chain
   */
  stdin(expected: string | RegExp, respond: string | Array<string>): this {
    assert(expected, '`expected is required');
    assert(respond, '`respond is required');

    this.addChain(async function stdin(this: Runner, ctx) {
      // check stdout
      const isPrompt = utils.validate(ctx.result.stdout.substring(ctx.lastPromptIndex!), expected);
      if (!isPrompt) {
        try {
          await pEvent(ctx.instance, 'stdout', {
            rejectionEvents: [ 'close' ],
            filter: () => {
              return utils.validate(ctx.result.stdout.substring(ctx.lastPromptIndex!), expected);
            },
          });
        } catch (err: any) {
          const msg = 'wait for prompt, but proccess is terminate with error';
          this.logger.error(msg);
          throw new RunnerError(msg, err);
        }
      }

      // remember last index
      ctx.lastPromptIndex = ctx.result.stdout.length;

      // respond to stdin
      if (!Array.isArray(respond)) respond = [ respond ];
      for (const str of respond) {
        // FIXME: when stdin.write, stdout will recieve duplicate output
        // auto add \n
        ctx.proc!.stdin!.write(str.replace(/\r?\n$/, '') + EOL);
        await utils.sleep(100); // wait a second
      }
    }, ChainType.RUNNING);
    return this;
  }

  /**
   * set working directory
   *
   * @param {string} dir - working directory
   * @param {Object} [opts] - options
   * @param {Boolean} [opts.init] - whether rm and mkdir dir before test
   * @param {Boolean} [opts.clean] - whether rm dir after test
   * @return {Runner} instance for chain
   */
  cwd(dir, opts: {
    init?: boolean;
    clean?: boolean;
  } = {}): this {
    this.ctx.cmdOpts.cwd = dir;

    // auto init
    const { init, clean } = opts;
    if (init) {
      this.use(async function initCwd(ctx, next) {
        // if dir is parent of cmdPath and process.cwd(), should throw
        const { cmd, cmdType } = ctx;
        assert(cmd, 'cmd is required');
        assert(!utils.isParent(dir, process.cwd()), `rm ${dir} is too dangerous`);
        assert(cmdType === 'spawn' || (cmdType === 'fork' && !utils.isParent(dir, cmd!)), `rm ${dir} is too dangerous`);

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
   * @param {string} key - env key
   * @param {string} value - env value
   * @return {Runner} instance for chain
   */
  env(key, value): this {
    this.ctx.cmdOpts.env[key] = value;
    return this;
  }

  /**
   * set a timeout, will kill SIGTERM then SIGKILL.
   *
   * @param {Number} ms - milliseconds
   * @return {Runner} instance for chain
   */
  timeout(ms): this {
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
   * @return {Runner} instance for chain
   */
  kill(): this {
    return this.addChain(async function kill(ctx) {
      ctx.proc!.cancel();
      await ctx.proc;
    });
  }
}
interface Runner extends OperationPlugin, ValidatorPlugin {}


export * from './constants.js';
export * from './assert.js';
export * from './logger.js';
export * from './utils.js';
export { Runner };

/**
 * create a runner
 * @param {Object} opts - options
 * @return {Runner} runner instance
 */
export function runner(opts?) {
  return new Runner(opts);
}
