import path from 'path';
import { assert, Expected } from './assert.js';
import * as utils from './utils.js';
import type { TestRunner, TestRunnerChainFunction } from './runner';
import { ChainType } from './runner';

/**
 * add a validate fn to chains
 *
 * @param {Function<Context>} fn - async ctx => ctx.assert(ctx.result.stdout.includes('hi'));
 * @throws {AssertionError}
 */
export function expect(this: TestRunner, fn: TestRunnerChainFunction) {
  const buildError = new Error('only for stack');
  return this.addChain(async ctx => {
    try {
      await fn.call(this, ctx);
    } catch (err) {
      throw mergeError(buildError, err);
    }
  });
}

const extractPathRegex = /\s+at.*[(\s](.*):\d+:\d+\)?/;
// TODO import.meta only allow for esm
// const __filename = filename(import.meta);
const __filename = 'validator.';

function mergeError(buildError, runError) {
  buildError.message = runError.message;
  buildError.actual = runError.actual;
  buildError.expected = runError.expected;
  buildError.operator = runError.operator;
  buildError.stackStartFn = runError.stackStartFn;
  buildError.cause = runError;

  buildError.stack = buildError.stack
    .split('\n')
    .filter(line => {
      /* istanbul ignore if */
      if (line.trim() === '') return false;
      const pathMatches = line.match(extractPathRegex);
      if (pathMatches === null || !pathMatches[1]) return true;
      if (pathMatches[1].startsWith(__filename)) return false;
      return true;
    })
    .join('\n');

  return buildError;
}

/**
 * validate file
 *
 *  - `file('/path/to/file')`: check whether file exists
 *  - `file('/path/to/file', /\w+/)`: check whether file match regexp
 *  - `file('/path/to/file', 'usage')`: check whether file includes specified string
 *  - `file('/path/to/file', { version: '1.0.0' })`: checke whether file content partial includes specified JSON
 *
 * @param {String} filePath - target path to validate, could be relative path
 * @param {String|RegExp|Object} [expected] - rule to validate
 * @throws {AssertionError}
 */
export function file(this: TestRunner, filePath: string, expected: Expected) {
  assert(filePath, '`filePath` is required');
  return Reflect.apply(expect, this, [
    async function file({ cwd, assert }) {
      const fullPath = path.resolve(cwd, filePath);
      await assert.matchFile(fullPath, expected);
    },
  ]);
}

/**
 * validate file with opposite rule
 *
 *  - `notFile('/path/to/file')`: check whether file don't exists
 *  - `notFile('/path/to/file', /\w+/)`: check whether file don't match regex
 *  - `notFile('/path/to/file', 'usage')`: check whether file don't includes specified string
 *  - `notFile('/path/to/file', { version: '1.0.0' })`: checke whether file content don't partial includes specified JSON
 *
 * @param {String} filePath - target path to validate, could be relative path
 * @param {String|RegExp|Object} [expected] - rule to validate
 * @throws {AssertionError}
 */
export function notFile(this: TestRunner, filePath: string, expected: Expected) {
  assert(filePath, '`filePath` is required');
  return Reflect.apply(expect, this, [
    async function notFile({ cwd, assert }) {
      const fullPath = path.resolve(cwd, filePath);
      await assert.doesNotMatchFile(fullPath, expected);
    },
  ]);
}

/**
 * validate stdout
 *
 *  - `stdout(/\w+/)`: check whether stdout match regex
 *  - `stdout('server started')`: check whether stdout includes some string
 *
 * @param {String|RegExp} expected - rule to validate
 * @throws {AssertionError}
 */
export function stdout(this: TestRunner, expected: Expected) {
  assert(expected, '`expected` is required');
  return Reflect.apply(expect, this, [
    async function stdout({ result, assert }) {
      assert.matchRule(result.stdout, expected);
    },
  ]);
}

/**
 * validate stdout with opposite rule
 *
 *  - `notStdout(/\w+/)`: check whether stdout don't match regex
 *  - `notStdout('server started')`: check whether stdout don't includes some string
 *
 * @param {String|RegExp} unexpected - rule to validate
 * @throws {AssertionError}
 */
export function notStdout(this: TestRunner, unexpected: Expected) {
  assert(unexpected, '`unexpected` is required');
  return Reflect.apply(expect, this, [
    async function notStdout({ result, assert }) {
      assert.doesNotMatchRule(result.stdout, unexpected);
    },
  ]);
}

/**
 * validate stderr
 *
 *  - `stderr(/\w+/)`: check whether stderr match regex
 *  - `stderr('server started')`: check whether stderr includes some string
 *
 * @param {String|RegExp} expected - rule to validate
 * @throws {AssertionError}
 */
export function stderr(this: TestRunner, expected: Expected) {
  assert(expected, '`expected` is required');
  return Reflect.apply(expect, this, [
    async function stderr({ result, assert }) {
      assert.matchRule(result.stderr, expected);
    },
  ]);
}

/**
 * validate stderr with opposite rule
 *
 *  - `notStderr(/\w+/)`: check whether stderr don't match regex
 *  - `notStderr('server started')`: check whether stderr don't includes some string
 *
 * @param {String|RegExp} unexpected - rule to validate
 * @throws {AssertionError}
 */
export function notStderr(this: TestRunner, unexpected: Expected) {
  assert(unexpected, '`unexpected` is required');
  return Reflect.apply(expect, this, [
    async function notStderr({ result, assert }) {
      assert.doesNotMatchRule(result.stderr, unexpected);
    },
  ]);
}

/**
 * validate process exitCode
 *
 * @param {Number|Function} n - value to compare
 * @throws {AssertionError}
 */
export function code(this: TestRunner, n: number | ((number) => void)) {
  this.expectedExitCode = n;

  const fn: (code: number) => void = utils.types.isFunction(n)
    ? n
    : code => assert.equal(code, n, `Expected exitCode to be ${n} but got ${code}`);

  Reflect.apply(expect, this, [
    function code({ result }) {
      // when using `.wait()`, it could maybe not exit at this time, so skip and will double check it later
      if (result.code !== undefined) {
        fn(result.code);
      }
    },
  ]);

  // double check
  this.addChain(async function code({ result }) {
    fn(result.code!);
  }, ChainType.END);

  return this;
}
