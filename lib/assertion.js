import assert from './assert-extend.js';

export function expect(fn) {
  return this._addAssertion(fn);
}

export function notExpect(fn) {
  return this._addAssertion(async ctx => {
    return assert.rejects(async () => {
      await fn(ctx);
    }, `${fn} should throws error`);
  });
}

export function stdout(rule) {
  assert(rule, '`stdout(rule)` is required');
  return this._addAssertion(({ result, assert }) => {
    assert.matchRule(result.stdout, rule);
  });
}

export function notStdout(rule) {
  assert(rule, '`notStdout(rule)` is required');
  return this._addAssertion(({ result, assert }) => {
    assert.doesNotMatchRule(result.stdout, rule);
  });
}

export function stderr(rule) {
  assert(rule, '`stderr(rule)` is required');
  return this._addAssertion(({ result, assert }) => {
    assert.matchRule(result.stderr, rule);
  });
}

export function notStderr(rule) {
  assert(rule, '`notStderr(rule)` is required');
  return this._addAssertion(({ result, assert }) => {
    assert.doesNotMatchRule(result.stderr, rule);
  });
}
