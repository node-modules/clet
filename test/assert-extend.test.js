import assert from '../lib/assert-extend';

describe('test/assert-extend.test.js', () => {
  it('matchRule', () => {
    assert.matchRule(123456, /\d+/);
    assert.matchRule('abc', /\w+/);
    assert.matchRule('abc', 'b');

    assert.throws(() => {
      assert.matchRule(123456, /abc/);
    }, {
      name: 'AssertionError',
      message: /The input did not match the regular expression/,
      actual: '123456',
      expected: /abc/,
    });

    assert.throws(() => {
      assert.matchRule('abc', 'cd');
    }, {
      name: 'AssertionError',
      message: /'abc' should includes 'cd'/,
      actual: 'abc',
      expected: 'cd',
    });
  });

  it('doesNotMatchRule', () => {
    assert.doesNotMatchRule(123456, /abc/);
    assert.doesNotMatchRule('abc', /\d+/);
    assert.doesNotMatchRule('abc', '123');

    assert.throws(() => {
      assert.doesNotMatchRule(123456, /\d+/);
    }, {
      name: 'AssertionError',
      message: /The input was expected to not match the regular expression/,
      actual: '123456',
      expected: /\d+/,
    });

    assert.throws(() => {
      assert.doesNotMatchRule('abcd', 'cd');
    }, {
      name: 'AssertionError',
      message: /'abcd' should not includes 'cd'/,
      actual: 'abcd',
      expected: 'cd',
    });
  });
});
