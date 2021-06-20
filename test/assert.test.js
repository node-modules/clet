import { assert, matchRule, doesNotMatchRule } from '../lib/utils';

describe('test/assert.test.js', () => {
  const pkgInfo = {
    name: 'btr',
    version: '1.0.0',
    config: {
      port: 8080,
    },
  };

  it('matchRule', () => {
    // regex
    matchRule(123456, /\d+/);
    matchRule('abc', /\w+/);

    assert.throws(() => {
      matchRule(123456, /abc/);
    }, {
      name: 'AssertionError',
      message: /The input did not match the regular expression/,
      actual: '123456',
      expected: /abc/,
    });

    // string
    matchRule('abc', 'b');
    assert.throws(() => {
      matchRule('abc', 'cd');
    }, {
      name: 'AssertionError',
      message: /'abc' should includes 'cd'/,
      actual: 'abc',
      expected: 'cd',
    });

    // JSON
    matchRule(pkgInfo, { name: 'btr', config: { port: 8080 } });
    matchRule(JSON.stringify(pkgInfo), { name: 'btr', config: { port: 8080 } });

    const unexpected = { name: 'btr', config: { a: '1' } };
    assert.throws(() => {
      matchRule(pkgInfo, unexpected);
    }, {
      name: 'AssertionError',
      message: /should partial includes/,
      actual: pkgInfo,
      expected: unexpected,
    });

    assert.throws(() => {
      matchRule(JSON.stringify(pkgInfo), unexpected);
    }, {
      name: 'AssertionError',
      message: /should partial includes/,
      actual: pkgInfo,
      expected: unexpected,
    });
  });

  it('doesNotMatchRule', () => {
    // regex
    doesNotMatchRule(123456, /abc/);
    doesNotMatchRule('abc', /\d+/);

    assert.throws(() => {
      doesNotMatchRule(123456, /\d+/);
    }, {
      name: 'AssertionError',
      message: /The input was expected to not match the regular expression/,
      actual: '123456',
      expected: /\d+/,
    });

    // string
    doesNotMatchRule('abc', '123');
    assert.throws(() => {
      doesNotMatchRule('abcd', 'cd');
    }, {
      name: 'AssertionError',
      message: /'abcd' should not includes 'cd'/,
      actual: 'abcd',
      expected: 'cd',
    });

    // JSON
    doesNotMatchRule(pkgInfo, { name: 'btr', config: { a: '1' } });
    doesNotMatchRule(JSON.stringify(pkgInfo), { name: 'btr', config: { a: '1' } });

    const unexpected = { name: 'btr', config: { port: 8080 } };
    assert.throws(() => {
      doesNotMatchRule(pkgInfo, unexpected);
    }, {
      name: 'AssertionError',
      message: /should not partial includes/,
      actual: pkgInfo,
      expected: unexpected,
    });

    assert.throws(() => {
      doesNotMatchRule(JSON.stringify(pkgInfo), unexpected);
    }, {
      name: 'AssertionError',
      message: /should not partial includes/,
      actual: pkgInfo,
      expected: unexpected,
    });
  });

  it.todo('error stack');
});
