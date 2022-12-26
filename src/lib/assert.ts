import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { match, doesNotMatch, AssertionError } from 'node:assert/strict';

import isMatch from 'lodash.ismatch';
import { types, exists } from './utils';

type Actual = string | number | Record<string, any>;
type Expected = string | RegExp | Record<string, any>;

/**
 * assert the `actual` is match `expected`
 *  - when `expected` is regexp, detect by `RegExp.test`
 *  - when `expected` is json, detect by `lodash.ismatch`
 *  - when `expected` is string, detect by `String.includes`
 */
export function matchRule(actual: Actual, expected: Expected) {
  if (types.isRegExp(expected)) {
    match(actual.toString(), expected);
  } else if (types.isObject(expected)) {
    // if pattern is `json`, then convert actual to json and check whether contains pattern
    const content = types.isString(actual) ? JSON.parse(actual) : actual;
    const result = isMatch(content, expected);
    if (!result) {
      // print diff
      throw new AssertionError({
        operator: 'should partial includes',
        actual: content,
        expected,
        stackStartFn: matchRule,
      });
    }
  } else if (actual === undefined || !actual.includes(expected)) {
    throw new AssertionError({
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
 */
export function doesNotMatchRule(actual: Actual, expected: Expected) {
  if (types.isRegExp(expected)) {
    doesNotMatch(actual.toString(), expected);
  } else if (types.isObject(expected)) {
    // if pattern is `json`, then convert actual to json and check whether contains pattern
    const content = types.isString(actual) ? JSON.parse(actual) : actual;
    const result = isMatch(content, expected);
    if (result) {
      // print diff
      throw new AssertionError({
        operator: 'should not partial includes',
        actual: content,
        expected,
        stackStartFn: doesNotMatchRule,
      });
    }
  } else if (actual === undefined || actual.includes(expected)) {
    throw new AssertionError({
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
 */
export async function matchFile(filePath: string, expected?: Expected) {
  // check whether file exists
  const isExists = await exists(filePath);
  assert(isExists, `Expected ${filePath} to be exists`);

  // compare content, support string/json/regex
  if (expected) {
    const content = await fs.readFile(filePath, 'utf-8');
    try {
      matchRule(content, expected);
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
 */
export async function doesNotMatchFile(filePath: string, expected?: Expected) {
  // check whether file exists
  const isExists = await exists(filePath);
  if (!expected) {
    assert(!isExists, `Expected ${filePath} to not be exists`);
  } else {
    assert(isExists, `Expected file(${filePath}) not to match \`${expected}\` but file not exists`);
    const content = await fs.readFile(filePath, 'utf-8');
    try {
      doesNotMatchRule(content, expected);
    } catch (err) {
      err.message = `file(${filePath}) with content: ${err.message}`;
      throw err;
    }
  }
}
