import path from 'path';
import * as utils from './utils.js';

const { assert } = utils;

/**
 * add a validate fn to chains
 *
 * @param {Function<RunnerContext>} fn - async ctx => ctx.assert(ctx.result.stdout.includes('hi'));
 * @throws {AssertionError}
 */
export function expect(fn) {
  return this._addChain(fn);
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
export function file(filePath, expected) {
  assert(filePath, '`filePath` is required');
  const fn = async ({ cwd, assert }) => {
    const fullPath = path.resolve(cwd, filePath);
    await assert.matchFile(fullPath, expected);
  };
  Object.defineProperty(fn, 'name', { value: `file(${filePath})`, configurable: true });
  return this.expect(fn);
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
export function notFile(filePath, expected) {
  assert(filePath, '`filePath` is required');
  const fn = async ({ cwd, assert }) => {
    const fullPath = path.resolve(cwd, filePath);
    await assert.doesNotMatchFile(fullPath, expected);
  };
  Object.defineProperty(fn, 'name', { value: `notFile(${filePath})`, configurable: true });
  return this.expect(fn);
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
export function stdout(expected) {
  assert(expected, '`expected` is required');
  const fn = ({ result, assert }) => {
    assert.matchRule(result.stdout, expected);
  };
  Object.defineProperty(fn, 'name', { value: `stdout(${expected})`, configurable: true });
  return this.expect(fn);
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
export function notStdout(unexpected) {
  assert(unexpected, '`unexpected` is required');

  const fn = ({ result, assert }) => {
    assert.doesNotMatchRule(result.stdout, unexpected);
  };
  Object.defineProperty(fn, 'name', { value: `notStdout(${unexpected})`, configurable: true });
  return this.expect(fn);
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
export function stderr(expected) {
  assert(expected, '`expected` is required');
  const fn = ({ result, assert }) => {
    assert.matchRule(result.stderr, expected);
  };
  Object.defineProperty(fn, 'name', { value: `stderr(${expected})`, configurable: true });
  return this.expect(fn);
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
export function notStderr(unexpected) {
  assert(unexpected, '`unexpected` is required');
  const fn = ({ result, assert }) => {
    assert.doesNotMatchRule(result.stderr, unexpected);
  };
  Object.defineProperty(fn, 'name', { value: `notStderr(${unexpected})`, configurable: true });
  return this.expect(fn);
}

/**
 * validate process exitCode
 *
 * @param {Number|Function} n - value to compare
 * @throws {AssertionError}
 */
export function code(n) {
  this._expectedExitCode = n;

  const fn = utils.types.isFunction(n) ? n : code => assert.equal(code, n, `Expected exitCode to be ${n} but got ${code}`);

  this.expect(function code({ result }) {
    // when using `.wait()`, it could maybe not exit at this time, so skip and will double check it later
    if (result.code !== undefined) {
      fn(result.code);
    }
  });

  // double check
  this._addChain(function code({ result }) {
    fn(result.code);
  }, 'end');

  return this;
}

function wrapError(fn, filePath) {
  try {
    fn();
  } catch (err) {
    err.message = `file(${filePath}) with content: ${err.message}`;
    throw err;
  }
}
