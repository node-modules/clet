import assert from '../assert-extend.js';

export function expect(fn) {
  return this._addChain(fn);
}

export function stdout(expected) {
  assert(expected, '`expected` is required');
  return this.expect(({ result, assert }) => {
    assert.matchRule(result.stdout, expected);
  });
}

export function notStdout(expected) {
  assert(expected, '`expected` is required');
  return this.expect(({ result, assert }) => {
    assert.doesNotMatchRule(result.stdout, expected);
  });
}

export function stderr(expected) {
  assert(expected, '`expected` is required');
  return this.expect(({ result, assert }) => {
    assert.matchRule(result.stderr, expected);
  });
}

export function notStderr(expected) {
  assert(expected, '`expected` is required');
  return this.expect(({ result, assert }) => {
    assert.doesNotMatchRule(result.stderr, expected);
  });
}

export function timeout(ms) {

}

export function code(n) {
  // assert after proc exit
  this._endingChains.push(({ result, assert }) => {
    assert.equal(result.code, n, `Expected exitCode to be ${n} but got ${result.code}`);
  });
  return this;
}
