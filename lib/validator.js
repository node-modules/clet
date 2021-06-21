import { promises as fs } from 'fs';
import path from 'path';
import * as utils from './utils';

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
 *  - `file('/path/to/file', /\w+/)`: check whether file match regex
 *  - `file('/path/to/file', 'usage')`: check whether file includes some string
 *
 * @param {String} filePath - target path to validate, could be relative path
 * @param {String|RegExp|Object} [expected] - rule to validate
 * @throws {AssertionError}
 */
export function file(filePath, expected) {
  assert(filePath, '`filePath` is required');

  return this.expect(async ({ cwd, assert }) => {
    const fullPath = path.resolve(cwd, filePath);

    // check whether file exists
    const isExists = await utils.exists(fullPath);
    assert(isExists, `Expected ${fullPath} to be exists`);

    // compare content, support string/json/regex
    if (expected) {
      const content = await fs.readFile(fullPath, 'utf-8');
      wrapError(() => assert.matchRule(content, expected), fullPath);
    }
  });
}

/**
 * validate file with opposite rule
 *
 *  - `notFile('/path/to/file')`: check whether file don't exists
 *  - `notFile('/path/to/file', /\w+/)`: check whether file don't match regex
 *  - `notFile('/path/to/file', 'usage')`: check whether file don't includes some string
 *
 * @param {String} filePath - target path to validate, could be relative path
 * @param {String|RegExp|Object} [expected] - rule to validate
 * @throws {AssertionError}
 */
export function notFile(filePath, expected) {
  assert(filePath, '`filePath` is required');

  return this.expect(async ({ cwd, assert }) => {
    const fullPath = path.resolve(cwd, filePath);

    // check whether file exists
    const isExists = await utils.exists(fullPath);
    if (!expected) {
      assert(!isExists, `Expected ${fullPath} to not be exists`);
    } else {
      assert(isExists, `Expected ${fullPath} to be exists`);
      const content = await fs.readFile(fullPath, 'utf-8');
      wrapError(() => assert.doesNotMatchRule(content, expected), fullPath);
    }
  });
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
  return this.expect(({ result, assert }) => {
    assert.matchRule(result.stdout, expected);
  });
}

/**
 * validate stdout with opposite rule
 *
 *  - `stdout(/\w+/)`: check whether stdout don't match regex
 *  - `stdout('server started')`: check whether stdout don't includes some string
 *
 * @param {String|RegExp} unexpected - rule to validate
 * @throws {AssertionError}
 */
export function notStdout(unexpected) {
  assert(unexpected, '`unexpected` is required');
  return this.expect(({ result, assert }) => {
    assert.doesNotMatchRule(result.stdout, unexpected);
  });
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
  return this.expect(({ result, assert }) => {
    assert.matchRule(result.stderr, expected);
  });
}

/**
 * validate stderr with opposite rule
 *
 *  - `stderr(/\w+/)`: check whether stderr don't match regex
 *  - `stderr('server started')`: check whether stderr don't includes some string
 *
 * @param {String|RegExp} unexpected - rule to validate
 * @throws {AssertionError}
 */
export function notStderr(unexpected) {
  assert(unexpected, '`unexpected` is required');
  return this.expect(({ result, assert }) => {
    assert.doesNotMatchRule(result.stderr, unexpected);
  });
}

/**
 * validate process exitCode
 *
 * @param {Number} n - value to compare
 * @throws {AssertionError}
 */
export function code(n) {
  // assert after proc exit
  this._expectedExitCode = n;
  this._endingChains.push(({ result, assert }) => {
    assert.equal(result.code, n, `Expected exitCode to be ${n} but got ${result.code}`);
  });
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
