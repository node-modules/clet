
import fs from 'fs/promises';
import { strict as assert } from 'assert';
import path from 'path';

import { dirname } from 'dirname-filename-esm';
import isMatch from 'lodash.ismatch';
import is from 'is-type-of';


assert.matchRule = matchRule;
assert.doesNotMatchRule = doesNotMatchRule;
export { is, isMatch, assert };

/**
 * assert the `actual` is match `expected`
 *  - when `expected` is regex, detect by `Regex.test`
 *  - when `expected` is json, detect by `lodash.ismatch`
 *  - when `expected` is string, detect by `String.includes`
 *
 * @param {String|Object} actual - actual string
 * @param {String|RegExp|Object} expected - rule to validate
 */
export function matchRule(actual, expected) {
  if (is.regexp(expected)) {
    assert.match(actual.toString(), expected);
  } else if (is.object(expected)) {
    // if pattern is `json`, then convert actual to json and check whether contains pattern
    const content = is.string(actual) ? JSON.parse(actual) : actual;
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
 *  - when `expected` is regex, detect by `Regex.test`
 *  - when `expected` is json, detect by `lodash.ismatch`
 *  - when `expected` is string, detect by `String.includes`
 *
 * @param {String|Object} actual - actual string
 * @param {String|RegExp|Object} expected - rule to validate
 */
export function doesNotMatchRule(actual, expected) {
  if (is.regexp(expected)) {
    assert.doesNotMatch(actual.toString(), expected);
  } else if (is.object(expected)) {
    // if pattern is `json`, then convert actual to json and check whether contains pattern
    const content = is.string(actual) ? JSON.parse(actual) : actual;
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

export function makeCheckFn(expected) {
  if (is.regexp(expected)) {
    return input => expected.test(input);
  } else if (is.string(expected)) {
    return input => input && input.includes(expected);
  } else if (is.object(expected)) {
    return input => isMatch(input, expected);
  }
  return expected;
}

export async function mkdir(p, opts) {
  return await fs.mkdir(p, { recursive: true, ...opts });
}

export async function rm(p, opts) {
  return await fs.rm(p, { force: true, recursive: true, ...opts });
}

export async function writeFile(filePath, content, opts) {
  await mkdir(path.dirname(filePath));
  if (is.object(content)) {
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
  const p = is.object(meta) ? dirname(meta) : meta;
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

