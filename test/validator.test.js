import path from 'path';
import runner from '../lib/runner.js';
import * as utils from './test-utils.js';

const { assert } = utils;

describe('test/validator.test.js', () => {
  const fixtures = path.resolve('test/fixtures');
  const tmpDir = utils.getTempDir();

  beforeEach(() => utils.initDir(tmpDir));

  describe('process', () => {
    it('should support expect()', async () => {
      await runner()
        .spawn('node -v')
        .expect(ctx => {
          const { assert, result } = ctx;
          assert.match(result.stdout, /v\d+\.\d+\.\d+/);
        })
        .end();
    });

    it('should support spawn', async () => {
      await runner()
        .spawn('node -v')
        .stdout(/v\d+\.\d+\.\d+/)
        .stdout(process.version)
        .notStdout('xxxx')
        .notStdout(/^abc/)
        .notStderr('xxxx')
        .notStderr(/^abc/)
        .code(0)
        .end();
    });

    it('should support stdout()', async () => {
      await runner()
        .cwd(fixtures)
        .fork('process.js')
        .stdout(/version: v\d+\.\d+\.\d+/)
        .stdout('argv:')
        .notStdout('xxxx')
        .notStdout(/^abc/)
        .end();
    });

    it('should support stderr()', async () => {
      await runner()
        .cwd(fixtures)
        .fork('process.js', [ '--error' ])
        .stderr(/an error/)
        .stderr('this is an error')
        .notStderr('xxxx')
        .notStderr(/^abc/)
        .end();
    });

    it('should support code(0)', async () => {
      await runner()
        .cwd(fixtures)
        .fork('process.js')
        .code(0)
        .end();
    });

    it('should support code(1)', async () => {
      await runner()
        .cwd(fixtures)
        .fork('process.js', [ '--fail' ])
        .code(1)
        .end();
    });

    it('should double check code()', async () => {
      await runner()
        .cwd(fixtures)
        .fork('process.js', [ '--delay' ])
        .wait('stdout', /delay for a while/)
        .code(0)
        .end();
    });

    it('should support code(fn)', async () => {
      await runner()
        .cwd(fixtures)
        .spawn('node --no-exists-argv')
        .code(n => n < 0)
        .end();
    });

    it('should throw if not calling code() when proc fail', async () => {
      await assert.rejects(async () => {
        await runner()
          .cwd(fixtures)
          .fork('process.js', [ '--fail' ])
          .end();
      }, /Command failed with exit code 1/);
    });
  });

  describe('file', () => {
    const cliPath = path.resolve(fixtures, 'file.js');
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
      }, /not-exist.md to be exists/);

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
});
