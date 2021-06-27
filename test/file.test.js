import path from 'path';
import runner from '../lib/runner.js';
import * as utils from './test-utils.js';

const { assert } = utils;

describe('test/file.test.js', () => {
  const fixtures = path.resolve('test/fixtures');
  const tmpDir = utils.getTempDir();
  const cliPath = path.resolve(fixtures, 'file.js');

  beforeEach(() => utils.initDir(tmpDir));

  it('should support file()', async () => {
    await runner()
      .cwd(tmpDir)
      .fork(cliPath)

      // check exists
      .file('./test.json') // support relative path
      .file(`${tmpDir}/test.md`)

      // check content
      .file(`${tmpDir}/test.md`, 'this is a README')
      .file(`${tmpDir}/test.md`, /this is a README/)
      .file(`${tmpDir}/test.json`, { name: 'test', config: { port: 8080 } })
      .end();

    await assert.rejects(async () => {
      await runner()
        .cwd(tmpDir)
        .fork(cliPath)

        // check exists
        .file(`${tmpDir}/not-exist.md`)
        .end();
    }, /not-exist.md to be exists/);

    await assert.rejects(async () => {
      await runner()
        .cwd(tmpDir)
        .fork(cliPath)

        // check includes
        .file(`${tmpDir}/test.md`, 'abc')
        .end();
    }, /file.*test\.md.*this is.*should includes 'abc'/);
  });

  it('should support notFile()', async () => {
    await runner()
      .cwd(tmpDir)
      .fork(cliPath)

      // check not exists
      .notFile('./abc')
      .notFile(`${tmpDir}/a/b/c/d.md`)

      // check content
      .notFile(`${tmpDir}/test.md`, 'abc')
      .notFile(`${tmpDir}/test.md`, /abcccc/)
      .notFile(`${tmpDir}/test.json`, { name: 'test', config: { a: 1 } })
      .end();


    await assert.rejects(async () => {
      await runner()
        .cwd(tmpDir)
        .fork(cliPath)

        // check exists
        .notFile(`${tmpDir}/not-exist.md`, 'abc')
        .end();
    }, /Expected file\(.*not-exist.md\) not to match.*but file not exists/);

    await assert.rejects(async () => {
      await runner()
        .cwd(tmpDir)
        .fork(cliPath)

        // check includes
        .notFile(`${tmpDir}/test.md`, 'this is a README')
        .end();
    }, /file.*test\.md.*this is.*should not includes 'this is a README'/);
  });
});
