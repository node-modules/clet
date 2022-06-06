import { EventEmitter } from 'events';
import * as execa from 'execa';
import { strict as assert } from 'assert';
import { types } from 'util';
import { mkdir } from 'fs/promises';
import { isMatch as isMatchFn } from 'lodash.ismatch';
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

// Logger
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

interface LoggerOptions {
  level?: LogLevel;
  indent?: number;
  showTag?: boolean;
  showTime?: boolean;
  tag?: string | string[];
}

export class Logger {
  constructor(tag: string, options?: LoggerOptions);
  constructor(options?: LoggerOptions);

  format(message: string, args?: any[], options?: LoggerOptions): string;

  level: LogLevel;

  child(tag: string, options?: LoggerOptions): Logger;
}

// Assertion
type AssertType = typeof assert;
type ExpectedAssertion = string | RegExp | object;

export interface CletAssert extends AssertType {
  matchRule(actual: string | object, expected: ExpectedAssertion): void;

  doseNotMatchRule(actual: string | object, expected: ExpectedAssertion): never;

  matchFile(filePath: string, expected: ExpectedAssertion): void;

  doesNotMatchFile(filePath: string, expected: ExpectedAssertion): void;
}

// Utils
export type WaitAssert = ExpectedAssertion | ExpectedAssertion[] | ((input: string | object) => void);

export interface CletUtils {
  types: typeof types;
  isMatch: isMatchFn;

  isString(input: any): boolean;
  isObject(input: any): boolean;
  isFunction(input: any): boolean;

  validate(input: string | object, expected: WaitAssert): boolean;

  isParent(parent: string, child: string): boolean;

  mkdir: typeof mkdir;

  rm(p: string | string[], opts: { trash?: boolean }): Promise<void>;

  writeFile(filePath: string, content: string | object, opts?: {
    encoding?: string;
    mode?: number;
    flag?: string;
    signal?: string;
  }): Promise<void>;

  exist(filePath: string): Promise<boolean>;

  resolve(meta: string | object, ...args: string[]): string;
  sleep(ms: number): Promise<void>;
}

// Runner
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

  fork(cmd: string, args?: string[], opts: execa.NodeOptions): this;

  spawn(cmd: string, args?: string[], opts: execa.NodeOptions): this;

  wait(type: WaitType, expect: WaitAssert): this;

  stdin(expected: string | RegExp, respond: string | string[]): this;

  cwd(dir: string, options?: {
    clean?: boolean;
    init?: boolean;
  }): this;

  env(key: string, value: string): this;

  timeout(ms: number): this;

  kill(): this;

  // Operation
  tap(fn: (ctx: TestRunnerContext) => void): this;

  log(format: string, ...args?: string[]): this;

  sleep(ms: number): this;

  mkdir(dir: string): this;

  rm(dir: string): this;

  writeFile(filePath: string, content: string | object): this;

  shell(cmd: string, args?: string[], opts: execa.NodeOptions): this;

  // Validator
  expect(fn: (ctx: TestRunnerContext) => void): this;

  file(filePath: string, expected: ExpectedAssertion): this;

  noFile(filePath: string, unexpected: ExpectedAssertion): this;

  stdout(expected: ExpectedAssertion): this;

  notStdout(unexpected: ExpectedAssertion): this;

  stderr(expected: ExpectedAssertion): this;

  notStderr(unexpected: ExpectedAssertion): this;

  code(n: number): this;
}

export function runner(options?: TestRunnerOptions): TestRunner;
