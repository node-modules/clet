import path from 'node:path';
import assert from 'node:assert/strict';

import { matchRule, doesNotMatchRule, matchFile, doesNotMatchFile } from '../../src/lib/assert';

describe('test/lib/assert.test.ts', () => {
  const pkgInfo = {
    name: 'clet',
    version: '1.0.0',
    config: {
      port: 8080,
    },
  };

  describe('matchRule', () => {
    it('should support regexp', () => {
      matchRule('abc', /\w+/);

      assert.throws(() => {
        matchRule('123456', /abc/);
      }, {
        name: 'AssertionError',
        message: /The input did not match the regular expression/,
        actual: '123456',
        expected: /abc/,
      });
    });

    it('should support string', () => {
      matchRule('abc', 'b');

      assert.throws(() => {
        matchRule('abc', 'cd');
      }, {
        name: 'AssertionError',
        message: /'abc' should includes 'cd'/,
        actual: 'abc',
        expected: 'cd',
      });
    });

    it('should support JSON', () => {
      matchRule(pkgInfo, { name: 'clet', config: { port: 8080 } });
      matchRule(JSON.stringify(pkgInfo), { name: 'clet', config: { port: 8080 } });

      const unexpected = { name: 'clet', config: { a: '1' } };
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
  });

  describe('doesNotMatchRule', () => {
    it('should support regexp', () => {
      doesNotMatchRule('abc', /\d+/);

      assert.throws(() => {
        doesNotMatchRule('123456', /\d+/);
      }, {
        name: 'AssertionError',
        message: /The input was expected to not match the regular expression/,
        actual: '123456',
        expected: /\d+/,
      });
    });

    it('should support string', () => {
      doesNotMatchRule('abc', '123');
      assert.throws(() => {
        doesNotMatchRule('abcd', 'cd');
      }, {
        name: 'AssertionError',
        message: /'abcd' should not includes 'cd'/,
        actual: 'abcd',
        expected: 'cd',
      });
    });

    it('should support json', () => {
      doesNotMatchRule(pkgInfo, { name: 'clet', config: { a: '1' } });
      doesNotMatchRule(JSON.stringify(pkgInfo), { name: 'clet', config: { a: '1' } });

      const unexpected = { name: 'clet', config: { port: 8080 } };
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
  });

  describe('matchFile', () => {
    const fixtures = path.resolve('test/fixtures/file');
    it('should check exists', async () => {
      await matchFile(`${fixtures}/test.md`);
      await assert.rejects(async () => {
        await matchFile(`${fixtures}/not-exist.md`);
      }, /not-exist.md to be exists/);
    });

    it('should check content', async () => {
      await matchFile(`${fixtures}/test.md`, 'this is a README');
      await matchFile(`${fixtures}/test.md`, /this is a README/);
      await matchFile(`${fixtures}/test.json`, { name: 'test', config: { port: 8080 } });

      await assert.rejects(async () => {
        await matchFile(`${fixtures}/test.md`, 'abc');
      }, /file.*test\.md.*this is.*should includes 'abc'/);
    });
  });

  describe('doesNotMatchFile', () => {
    const fixtures = path.resolve('test/fixtures/file');
    it('should check not exists', async () => {
      await doesNotMatchFile(`${fixtures}/a/b/c/d.md`);

      await assert.rejects(async () => {
        await doesNotMatchFile(`${fixtures}/not-exist.md`, 'abc');
      }, /Expected file\(.*not-exist.md\) not to match.*but file not exists/);
    });

    it('should check not content', async () => {
      await doesNotMatchFile(`${fixtures}/test.md`, 'abc');
      await doesNotMatchFile(`${fixtures}/test.md`, /abcccc/);
      await doesNotMatchFile(`${fixtures}/test.json`, { name: 'test', config: { a: 1 } });

      await assert.rejects(async () => {
        await doesNotMatchFile(`${fixtures}/test.md`, 'this is a README');
      }, /file.*test\.md.*this is.*should not includes 'this is a README'/);
    });
  });

  // it.todo('error stack');
});
