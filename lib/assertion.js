import { assert, assertRule, assertRuleFail } from './utils';

export function stdout(rule) {
  assert(rule, '`stdout(rule)` is required');
  return this._addAssertion(({ stdout }) => {
    assertRule(stdout, rule);
  });
}

export function notStdout(rule) {
  assert(rule, '`stdout(rule)` is required');
  return this._addAssertion(({ stdout }) => {
    assertRuleFail(stdout, rule);
  });
}

export function stderr(rule) {
  assert(rule, '`stderr(rule)` is required');
  return this._addAssertion(({ stderr }) => {
    assertRule(stderr, rule);
  });
}

export function notStderr(rule) {
  assert(rule, '`stderr(rule)` is required');
  return this._addAssertion(({ stderr }) => {
    assertRuleFail(stderr, rule);
  });
}
