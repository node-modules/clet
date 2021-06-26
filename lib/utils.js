
import { promises as fs } from 'fs';
import { strict as assert } from 'assert';
import { types } from 'util';
import path from 'path';

import { dirname } from 'dirname-filename-esm';
import isMatch from 'lodash.ismatch';
import trash from 'trash';

types.isString = function(v) { return typeof v === 'string'; };
types.isObject = function(v) { return v !== null && typeof v === 'object'; };
types.isFunction = function(v) { return typeof v === 'function'; };

assert.matchRule = matchRule;
assert.doesNotMatchRule = doesNotMatchRule;
assert.matchFile = matchFile;
assert.doesNotMatchFile = doesNotMatchFile;

export { types, isMatch, assert };

/**
 * assert the `actual` is match `expected`
 *  - when `expected` is regexp, detect by `RegExp.test`
 *  - when `expected` is json, detect by `lodash.ismatch`
 *  - when `expected` is string, detect by `String.includes`
 *
 * @param {String|Object} actual - actual string
 * @param {String|RegExp|Object} expected - rule to validate
 */
export function matchRule(actual, expected) {
  if (types.isRegExp(expected)) {
    assert.match(actual.toString(), expected);
  } else if (types.isObject(expected)) {
    // if pattern is `json`, then convert actual to json and check whether contains pattern
    const content = types.isString(actual) ? JSON.parse(actual) : actual;
    const result = isMatch(content, expected);
    if (!result) {
      // print diff
      throw new assert.AssertionError({
        operator: 'should partial includes',
        actual: content,
        expected,
        stackStartFn: matchRule,
      });
    }
  } else if (actual === undefined || !actual.includes(expected)) {
    throw new assert.AssertionError({
      operator: 'should includes',
      actual,
      expected,
      stackStartFn: matchRule,
    });
  }
}

/**
 * assert the `actual` is not match `expected`
 *  - when `expected` is regexp, detect by `RegExp.test`
 *  - when `expected` is json, detect by `lodash.ismatch`
 *  - when `expected` is string, detect by `String.includes`
 *
 * @param {String|Object} actual - actual string
 * @param {String|RegExp|Object} expected - rule to validate
 */
export function doesNotMatchRule(actual, expected) {
  if (types.isRegExp(expected)) {
    assert.doesNotMatch(actual.toString(), expected);
  } else if (types.isObject(expected)) {
    // if pattern is `json`, then convert actual to json and check whether contains pattern
    const content = types.isString(actual) ? JSON.parse(actual) : actual;
    const result = isMatch(content, expected);
    if (result) {
      // print diff
      throw new assert.AssertionError({
        operator: 'should not partial includes',
        actual: content,
        expected,
        stackStartFn: doesNotMatchRule,
      });
    }
  } else if (actual === undefined || actual.includes(expected)) {
    throw new assert.AssertionError({
      operator: 'should not includes',
      actual,
      expected,
      stackStartFn: doesNotMatchRule,
    });
  }
}

/**
 * validate file
 *
 *  - `matchFile('/path/to/file')`: check whether file exists
 *  - `matchFile('/path/to/file', /\w+/)`: check whether file match regexp
 *  - `matchFile('/path/to/file', 'usage')`: check whether file includes specified string
 *  - `matchFile('/path/to/file', { version: '1.0.0' })`: checke whether file content partial includes specified JSON
 *
 * @param {String} filePath - target path to validate, could be relative path
 * @param {String|RegExp|Object} [expected] - rule to validate
 * @throws {AssertionError}
 */
export async function matchFile(filePath, expected) {
  // check whether file exists
  const isExists = await exists(filePath);
  assert(isExists, `Expected ${filePath} to be exists`);

  // compare content, support string/json/regex
  if (expected) {
    const content = await fs.readFile(filePath, 'utf-8');
    try {
      assert.matchRule(content, expected);
    } catch (err) {
      err.message = `file(${filePath}) with content: ${err.message}`;
      throw err;
    }
  }
}

/**
 * validate file with opposite rule
 *
 *  - `doesNotMatchFile('/path/to/file')`: check whether file don't exists
 *  - `doesNotMatchFile('/path/to/file', /\w+/)`: check whether file don't match regex
 *  - `doesNotMatchFile('/path/to/file', 'usage')`: check whether file don't includes specified string
 *  - `doesNotMatchFile('/path/to/file', { version: '1.0.0' })`: checke whether file content don't partial includes specified JSON
 *
 * @param {String} filePath - target path to validate, could be relative path
 * @param {String|RegExp|Object} [expected] - rule to validate
 * @throws {AssertionError}
 */
export async function doesNotMatchFile(filePath, expected) {
  // check whether file exists
  const isExists = await exists(filePath);
  if (!expected) {
    assert(!isExists, `Expected ${filePath} to not be exists`);
  } else {
    assert(isExists, `Expected ${filePath} to be exists`);
    const content = await fs.readFile(filePath, 'utf-8');
    try {
      assert.doesNotMatchRule(content, expected);
    } catch (err) {
      err.message = `file(${filePath}) with content: ${err.message}`;
      throw err;
    }
  }
}

export function validate(input, expected) {
  if (Array.isArray(expected)) {
    return expected.some(rule => validate(input, rule));
  } else if (types.isRegExp(expected)) {
    return expected.test(input);
  } else if (types.isString(expected)) {
    return input && input.includes(expected);
  } else if (types.isObject(expected)) {
    return isMatch(input, expected);
  }
  return expected(input);
}

export async function mkdir(p, opts) {
  return await fs.mkdir(p, { recursive: true, ...opts });
}

export async function rm(p, opts) {
  return await trash(p, opts);
  // return await fs.rm(p, { force: true, recursive: true, ...opts });
}

/**
 * Check whether is parent
 *
 * @param {String} parent - parent file path
 * @param {String} child - child file path
 * @return {Boolean} true if parent >= child
 */
export function isParent(parent, child) {
  const p = path.relative(parent, child);
  return !(p === '' || p.startsWith('..'));
}

export async function writeFile(filePath, content, opts) {
  await mkdir(path.dirname(filePath));
  if (types.isObject(content)) {
    content = JSON.stringify(content, null, 2);
  }
  return await fs.writeFile(filePath, content, opts);
}

export async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_) {
    return false;
  }
}

export function resolve(meta, ...args) {
  const p = types.isObject(meta) ? dirname(meta) : meta;
  return path.resolve(p, ...args);
}

export function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export function filterAndJoin(arr, separator = ' ') {
  return arr.filter(x => x).join(separator);
}
