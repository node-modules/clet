import assert from '../lib/assert-extend';

describe('test/assert-extend.test.js', () => {
  const pkgInfo = {
    name: 'btr',
    version: '1.0.0',
    config: {
      port: 8080,
    },
  };

  it('matchRule', () => {
    // regex
    assert.matchRule(123456, /\d+/);
    assert.matchRule('abc', /\w+/);

    assert.throws(() => {
      assert.matchRule(123456, /abc/);
    }, {
      name: 'AssertionError',
      message: /The input did not match the regular expression/,
      actual: '123456',
      expected: /abc/,
    });

    // string
    assert.matchRule('abc', 'b');
    assert.throws(() => {
      assert.matchRule('abc', 'cd');
    }, {
      name: 'AssertionError',
      message: /'abc' should includes 'cd'/,
      actual: 'abc',
      expected: 'cd',
    });

    // JSON
    assert.matchRule(pkgInfo, { name: 'btr', config: { port: 8080 } });
    assert.matchRule(JSON.stringify(pkgInfo), { name: 'btr', config: { port: 8080 } });

    const unexpected = { name: 'btr', config: { a: '1' } };
    assert.throws(() => {
      assert.matchRule(pkgInfo, unexpected);
    }, {
      name: 'AssertionError',
      message: /should partial includes/,
      actual: pkgInfo,
      expected: unexpected,
    });

    assert.throws(() => {
      assert.matchRule(JSON.stringify(pkgInfo), unexpected);
    }, {
      name: 'AssertionError',
      message: /should partial includes/,
      actual: pkgInfo,
      expected: unexpected,
    });
  });

  it('doesNotMatchRule', () => {
    // regex
    assert.doesNotMatchRule(123456, /abc/);
    assert.doesNotMatchRule('abc', /\d+/);

    assert.throws(() => {
      assert.doesNotMatchRule(123456, /\d+/);
    }, {
      name: 'AssertionError',
      message: /The input was expected to not match the regular expression/,
      actual: '123456',
      expected: /\d+/,
    });

    // string
    assert.doesNotMatchRule('abc', '123');
    assert.throws(() => {
      assert.doesNotMatchRule('abcd', 'cd');
    }, {
      name: 'AssertionError',
      message: /'abcd' should not includes 'cd'/,
      actual: 'abcd',
      expected: 'cd',
    });

    // JSON
    assert.doesNotMatchRule(pkgInfo, { name: 'btr', config: { a: '1' } });
    assert.doesNotMatchRule(JSON.stringify(pkgInfo), { name: 'btr', config: { a: '1' } });

    const unexpected = { name: 'btr', config: { port: 8080 } };
    assert.throws(() => {
      assert.doesNotMatchRule(pkgInfo, unexpected);
    }, {
      name: 'AssertionError',
      message: /should not partial includes/,
      actual: pkgInfo,
      expected: unexpected,
    });

    assert.throws(() => {
      assert.doesNotMatchRule(JSON.stringify(pkgInfo), unexpected);
    }, {
      name: 'AssertionError',
      message: /should not partial includes/,
      actual: pkgInfo,
      expected: unexpected,
    });
  });
});
