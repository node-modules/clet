import { strict as assert, AssertionError } from 'assert';

export { strict as assert } from 'assert';

export function isRegex(input) {
  return input instanceof RegExp;
}

export function assertRule(actual, expected) {
  if (isRegex(expected)) {
    assert.match(actual.toString(), expected);
  } else if (actual === undefined || !actual.includes(expected)) {
    throw new AssertionError({
      operator: 'should includes',
      actual,
      expected,
      stackStartFn: assertRule,
    });
  }
}

export function assertRuleFail(actual, expected) {
  if (isRegex(expected)) {
    assert.doesNotMatch(actual.toString(), expected);
  } else if (actual === undefined || actual.includes(expected)) {
    throw new AssertionError({
      operator: 'should not includes',
      actual,
      expected,
      stackStartFn: assertRule,
    });
  }
}
