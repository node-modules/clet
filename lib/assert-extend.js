import { strict as assert } from 'assert';
const { AssertionError } = assert;

function isRegex(input) {
  return input instanceof RegExp;
}

function assertFn(...args) {
  return assert.ok(...args);
}

Object.assign(assertFn, {
  ...assert,

  /**
   * assert the `actual` is match `expected`
   *  - when `expected` is string, detect by `String.includes`
   *  - when `expected` is regex, detect by `Regex.test`
   *
   * @param {String} actual - actual string
   * @param {String|RegExp} expected - rule to validate
   */
  matchRule(actual, expected) {
    if (isRegex(expected)) {
      assert.match(actual.toString(), expected);
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
   *  - when `expected` is string, detect by `String.includes`
   *  - when `expected` is regex, detect by `Regex.test`
   *
   * @param {String} actual - actual string
   * @param {String|RegExp} expected - rule to validate
   */
  doesNotMatchRule(actual, expected) {
    if (isRegex(expected)) {
      assert.doesNotMatch(actual.toString(), expected);
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
