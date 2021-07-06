import { EventEmitter } from 'events';
import * as execa from 'execa';
import { strict as assert } from 'assert';
import { types } from 'util';
import isMatch from 'lodash.ismatch';
import { Options as TrashOptions } from 'trash';

export type KEYS = {
  UP: '\u001b[A',
  DOWN: '\u001b[B',
  LEFT: '\u001b[D',
  RIGHT: '\u001b[C',
  ENTER: string,
  SPACE: ' ',
}

export type FunctionPlugin = (runner: TestRunner) => void;
export type ObjectPlugin = Record<string, any>;
export type Plugin = FunctionPlugin | ObjectPlugin;

interface LoggerOptions {
  level: LogLevel;
  indent: number;
  showTag: boolean;
  showTime: boolean;
}

export class Logger {
  constructor(tag: string, options?: LoggerOptions);
  constructor(options: LoggerOptions);

  format(message: string, args: any[], options: LoggerOptions);

  level: LogLevel;

  child(tag: string, options: LoggerOptions);
}

type AssertType = typeof assert;

export interface CletAssert extends AssertType {
  matchRule(actual: string | object, expected: string | RegExp | object)

  doseNotMatchRule(actual: string | object, expected: string | RegExp | object)

  matchFile(filePath: string, expected: string | RegExp | object);

  doesNotMatchFile(filePath: string, expected: string | RegExp | object);
}

export interface CletUtils {
  types: typeof types;
  isMatch: isMatch;

  validate(input: string | object, WaitAssert);

  isParent(parent: string, child: string);

  mkdir(dir: string, opts?: {
    recursive?: boolean;
    mode?: string | number;
  }): Promise<void>;

  rm(p: string | any[], opts: TrashOptions);

  writeFile(filePath: string, content: string | object, opts?: {
    encoding?: string;
    mode?: number;
    flag?: string;
    signal?: string;
  }): Promise<void>;

  exist(filePath: string): Promise<boolean>;

  resolve(meta: object, ...args: string[]);
  sleep(ms: number): Promise<void>;
}


export interface TestRunnerContext {
  instance: TestRunner;
  logger: Logger;
  assert: CletAssert;
  utils: CletUtils;
  cmd?: string;
  cmdType?: 'fork' | 'spawn';
  cmdArgs: string[];
  cmdOpts: {
    reject: boolean;
    cwd: string;
    env: Record<string, string>;
    preferLocal: boolean;
  },
  cwd: string;
  env: Record<string, string>;
  proc: execa.ExecaChildProcess;
  result: {
    stdout: string;
    stderr: string;
    code?: number;
    stopped?: boolean;
  },
}

export enum WaitType {
  message = 'message',
  stdout = 'stdout',
  stderr = 'stderr',
  close = 'close',
}

export type WaitAssert = string | RegExp | object | ((input: string | object) => void);

export type TestRunnerMiddleware = (ctx: TestRunnerContext, next: any) => Promise<void>;

export interface TestRunnerOptions {
  autoWait: boolean;
  plugins: Plugin | Array<Plugin>;
}

export class TestRunner extends EventEmitter {
  constructor(options: TestRunnerOptions);

  options: TestRunnerOptions;
  middlewares: TestRunnerMiddleware[];
  proc?: execa.ExecaChildProcess;
  ctx: TestRunnerContext;

  debug(leve: LogLevel): this;

  register(plugins: Plugin | Array<Plugin>): this;

  use(fn: TestRunnerMiddleware): this;

  end(): Promise<void>;

  fork(cmd: string, args: any[], opts: execa.NodeOptions): this;

  spawn(cmd: string, args: any[], opts: execa.NodeOptions): this;

  wait(type: WaitType, expect: WaitAssert): this;

  stdin(expected: string | RegExp, respond: string | any[]): this;

  cwd(dir: string, options?: {
    clean?: boolean;
    init?: boolean;
  }): this;

  env(key: string, value: string): this;

  timeout(ms: number): this;

  kill()
}

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  LOG = 2,
  INFO = 3,
  DEBUG = 4,
  TRACE = 5,
  Silent = -Infinity,
  Verbose = Infinity,
}

export function runner(options: TestRunnerOptions): TestRunner;
