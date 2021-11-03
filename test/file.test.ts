import path from 'path';
import { runner } from '../src/runner';
import * as utils from './test-utils';
import { strict as assert } from 'assert';

describe('test/file.test.js', () => {
  const fixtures = path.resolve('test/fixtures');
  const tmpDir = utils.getTempDir();
  const cliPath = path.resolve(fixtures, 'file.js');

  describe('file()', () => {
    it('should check exists', async () => {
      await runner()
        .cwd(tmpDir, { init: true })
        .fork(cliPath)

        // check exists
        .file('./test.json') // support relative path
        .file(`${tmpDir}/test.md`);
    });

    it('should check exists fail', async () => {
      await assert.rejects(async () => {
        await runner()
          .cwd(tmpDir, { init: true })
          .fork(cliPath)
          .file(`${tmpDir}/not-exist.md`);
      }, /not-exist.md to be exists/);
    });

    it('should check content', async () => {
      await runner()
        .cwd(tmpDir, { init: true })
        .fork(cliPath)
        .file(`${tmpDir}/test.md`, 'this is a README')
        .file(`${tmpDir}/test.md`, /this is a README/)
        .file(`${tmpDir}/test.json`, { name: 'test', config: { port: 8080 } });
    });

    it('should check content fail', async () => {
      await assert.rejects(async () => {
        await runner()
          .cwd(tmpDir, { init: true })
          .fork(cliPath)
          .file(`${tmpDir}/test.md`, 'abc');
      }, /file.*test\.md.*this is.*should includes 'abc'/);
    });
  });

  describe('notFile()', () => {
    it('should check not exists', async () => {
      await runner()
        .cwd(tmpDir, { init: true })
        .fork(cliPath)
        .notFile('./abc')
        .notFile(`${tmpDir}/a/b/c/d.md`);

    });

    it('should check not exists fail', async () => {
      await assert.rejects(async () => {
        await runner()
          .cwd(tmpDir, { init: true })
          .fork(cliPath)
          .notFile(`${tmpDir}/not-exist.md`, 'abc');
      }, /Expected file\(.*not-exist.md\) not to match.*but file not exists/);
    });

    it('should check not content', async () => {
      await runner()
        .cwd(tmpDir, { init: true })
        .fork(cliPath)
        .notFile(`${tmpDir}/test.md`, 'abc')
        .notFile(`${tmpDir}/test.md`, /abcccc/)
        .notFile(`${tmpDir}/test.json`, { name: 'test', config: { a: 1 } });
    });

    it('should check not content fail', async () => {
      await assert.rejects(async () => {
        await runner()
          .cwd(tmpDir, { init: true })
          .fork(cliPath)
          .notFile(`${tmpDir}/test.md`, 'this is a README');
      }, /file.*test\.md.*this is.*should not includes 'this is a README'/);
    });
  });
});
