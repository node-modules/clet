import { strict as assert } from 'assert';
import * as utils from '../lib/utils.js';

describe('test/utils.test.js', () => {
  it('isRegex', () => {
    assert(utils.isRegex(/abc/));
    assert(!utils.isRegex('abc'));
  });

  it('assertRule', () => {
    utils.assertRule(123456, /\d+/);
    utils.assertRule('abc', /\w+/);
    utils.assertRule('abc', 'b');

    assert.throws(() => {
      utils.assertRule(123456, /abc/);
    }, {
      name: 'AssertionError',
      message: /The input did not match the regular expression/,
      actual: '123456',
      expected: /abc/,
    });

    assert.throws(() => {
      utils.assertRule('abc', 'cd');
    }, {
      name: 'AssertionError',
      message: /'abc' should includes 'cd'/,
      actual: 'abc',
      expected: 'cd',
    });
  });

  it('assertRuleFail', () => {
    utils.assertRuleFail(123456, /abc/);
    utils.assertRuleFail('abc', /\d+/);
    utils.assertRuleFail('abc', '123');

    assert.throws(() => {
      utils.assertRuleFail(123456, /\d+/);
    }, {
      name: 'AssertionError',
      message: /The input was expected to not match the regular expression/,
      actual: '123456',
      expected: /\d+/,
    });

    assert.throws(() => {
      utils.assertRuleFail('abcd', 'cd');
    }, {
      name: 'AssertionError',
      message: /'abcd' should not includes 'cd'/,
      actual: 'abcd',
      expected: 'cd',
    });
  });
});
