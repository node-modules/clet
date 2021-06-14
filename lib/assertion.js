import assert from './assert-extend.js';

export function expect(fn) {
  return this._addAssertion(fn);
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

// TODO: server mode, should wait for exit
export function code(n) {
  return this._addAssertion(({ result, assert }) => {
    assert.equal(result.code, n, `Expected exitCode to be ${n} but got ${result.code}`);
  });
}
