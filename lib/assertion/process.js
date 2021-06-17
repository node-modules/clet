import assert from '../assert-extend.js';

export function expect(fn) {
  return this._addChain(fn);
}

export function stdout(rule) {
  assert(rule, '`rule` is required');
  return this.expect(({ result, assert }) => {
    assert.matchRule(result.stdout, rule);
  });
}

export function notStdout(rule) {
  assert(rule, '`rule` is required');
  return this.expect(({ result, assert }) => {
    assert.doesNotMatchRule(result.stdout, rule);
  });
}

export function stderr(rule) {
  assert(rule, '`rule` is required');
  return this.expect(({ result, assert }) => {
    assert.matchRule(result.stderr, rule);
  });
}

export function notStderr(rule) {
  assert(rule, '`rule` is required');
  return this.expect(({ result, assert }) => {
    assert.doesNotMatchRule(result.stderr, rule);
  });
}

export function code(n) {
  // assert after proc exit
  this._afterChains.push(({ result, assert }) => {
    assert.equal(result.code, n, `Expected exitCode to be ${n} but got ${result.code}`);
  });
  return this;
}
