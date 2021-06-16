import { strict as assert } from 'assert';
import { is } from './utils';
import isMatch from 'lodash.ismatch';
const { AssertionError } = assert;


// TODO: JSDOC for extend
/**
 * @extends {assert}
 * @typedef assertFn
 */

function assertFn(...args) {
  return assert.ok(...args);
}

Object.assign(assertFn, {
  ...assert,

  /**
   * assert the `actual` is match `expected`
   *  - when `expected` is regex, detect by `Regex.test`
   *  - when `expected` is json, detect by `lodash.ismatch`
   *  - when `expected` is string, detect by `String.includes`
   *
   * @param {String|Object} actual - actual string
   * @param {String|RegExp|Object} expected - rule to validate
   */
  matchRule(actual, expected) {
    if (is.regexp(expected)) {
      assert.match(actual.toString(), expected);
    } else if (is.object(expected)) {
      // if pattern is `json`, then convert actual to json and check whether contains pattern
      const content = is.string(actual) ? JSON.parse(actual) : actual;
      const result = isMatch(content, expected);
      if (!result) {
        // print diff
        throw new AssertionError({
          operator: 'should partial includes',
          actual: content,
          expected,
          stackStartFn: assertFn.matchRule,
        });
      }
    } else if (actual === undefined || !actual.includes(expected)) {
      throw new AssertionError({
        operator: 'should includes',
        actual,
        expected,
        stackStartFn: assertFn.matchRule,
      });
    }
  },

  /**
   * assert the `actual` is not match `expected`
   *  - when `expected` is regex, detect by `Regex.test`
   *  - when `expected` is json, detect by `lodash.ismatch`
   *  - when `expected` is string, detect by `String.includes`
   *
   * @param {String|Object} actual - actual string
   * @param {String|RegExp|Object} expected - rule to validate
   */
  doesNotMatchRule(actual, expected) {
    if (is.regexp(expected)) {
      assert.doesNotMatch(actual.toString(), expected);
    } else if (is.object(expected)) {
      // if pattern is `json`, then convert actual to json and check whether contains pattern
      const content = is.string(actual) ? JSON.parse(actual) : actual;
      const result = isMatch(content, expected);
      if (result) {
        // print diff
        throw new AssertionError({
          operator: 'should not partial includes',
          actual: content,
          expected,
          stackStartFn: assertFn.doesNotMatchRule,
        });
      }
    } else if (actual === undefined || actual.includes(expected)) {
      throw new AssertionError({
        operator: 'should not includes',
        actual,
        expected,
        stackStartFn: assertFn.doesNotMatchRule,
      });
    }
  },
});

export default assertFn;
