import runner from '../lib/runner';
import * as utils from './utils';

describe('test/assertion.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');
  const tmpDir = utils.getTempDir(expect);

  beforeEach(() => utils.initDir(tmpDir));

  describe('fs', () => {
    it('should check file', async () => {
      await runner()
        .cwd(tmpDir)
        .fork(`${fixtures}/assertion-fs.js`)

        // check exists
        .file('../../fixtures/file/package.json')
        .file(`${fixtures}/file/README.md`)

        // check content
        .file(`${fixtures}/file/README.md`, 'this is a README')
        .file(`${fixtures}/file/README.md`, /this is a README/)
        .file(`${fixtures}/file/package.json`, { name: 'test', config: { port: 8080 } })
        .end();

      await utils.assert.rejects(async () => {
        await runner()
          .cwd(tmpDir)
          .fork(`${fixtures}/assertion-fs.js`)

          // check exists
          .file(`${fixtures}/file/README.md`, 'abc')
          .end();
      }, /file.*README\.md.*this is.*should includes 'abc'/);

      await utils.assert.rejects(async () => {
        await runner()
          .cwd(tmpDir)
          .fork(`${fixtures}/assertion-fs.js`)

          // check exists
          .file(`${fixtures}/file/not-exist.md`)
          .end();
      }, /not-exist.md to be exists/);
    });

    it('should check notFile', async () => {
      await runner()
        .cwd(tmpDir)
        .fork(`${fixtures}/assertion-fs.js`)

        // check not exists
        .notFile('../../fixtures/file/abc')
        .notFile(`${fixtures}/file/a/b/c/d.md`)

        // check content
        .notFile(`${fixtures}/file/README.md`, 'abc')
        .notFile(`${fixtures}/file/README.md`, /abcccc/)
        .notFile(`${fixtures}/file/package.json`, { name: 'test', config: { a: 1 } })
        .end();


      await utils.assert.rejects(async () => {
        await runner()
          .cwd(tmpDir)
          .fork(`${fixtures}/assertion-fs.js`)

          // check exists
          .notFile(`${fixtures}/file/not-exist.md`, 'abc')
          .end();
      }, /not-exist.md to be exists/);

      await utils.assert.rejects(async () => {
        await runner()
          .cwd(tmpDir)
          .fork(`${fixtures}/assertion-fs.js`)

          // check exists
          .notFile(`${fixtures}/file/README.md`, 'this is a README')
          .end();
      }, /file.*README\.md.*this is.*should not includes 'this is a README'/);
    });
  });

  describe('process', () => {
    it('should assert process', async () => {
      await runner()
        .cwd(fixtures)
        .fork(`${fixtures}/assertion-process.js`)
        .stdout('version: v')
        .stdout(/argv:/)
        .notStdout('xxxx')
        .notStdout(/^abc/)
        .expect(ctx => {
          const { stdout } = ctx.result;
          ctx.assert.match(stdout, /argv:/);
        })
        .expect(async ctx => {
          const { stdout } = ctx.result;
          await utils.sleep(100);
          ctx.assert.match(stdout, /argv:/);
        })
        .code(0)
        .end();
    });

    it('should assert process with error', async () => {
      await runner()
        .cwd(fixtures)
        .fork(`${fixtures}/assertion-process.js`, [ '--error' ])
        .stdout('version: v')
        .stderr(/this is an error/)
        .stderr('an error')
        .notStderr('xxxx')
        .notStderr(/^abc/)
        .expect(ctx => {
          const { stdout } = ctx.result;
          ctx.assert.match(stdout, /argv:/);
        })
        .expect(async ctx => {
          const { stderr } = ctx.result;
          await utils.sleep(100);
          ctx.assert.match(stderr, /this is an error/);
        })
        .code(0)
        .end();
    });

    it('should assert process with fail', async () => {
      await utils.assert.rejects(async () => {
        await runner()
          .cwd(fixtures)
          .fork(`${fixtures}/assertion-process.js`, [ '--fail' ])
          .stdout('version: v')
          .stderr(/this is an error/)
          .stderr('an error')
          .notStderr('xxxx')
          .notStderr(/^abc/)
          .expect(ctx => {
            const { stdout } = ctx.result;
            ctx.assert.match(stdout, /argv:/);
          })
          .code(1)
          .end();
      }, /Command failed/);
    });
  });
});
