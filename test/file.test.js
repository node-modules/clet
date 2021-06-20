import runner from '../lib/runner';
import * as utils from './utils';

describe('test/file.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');
  const tmpDir = utils.getTempDir(expect);

  beforeEach(() => utils.initDir(tmpDir));

  it('should check file', async () => {
    await runner()
      .cwd(tmpDir)
      .fork(`${fixtures}/file.js`)

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
        .fork(`${fixtures}/file.js`)

        // check exists
        .file(`${fixtures}/file/README.md`, 'abc')
        .end();
    }, /file.*README\.md.*this is.*should includes 'abc'/);

    await utils.assert.rejects(async () => {
      await runner()
        .cwd(tmpDir)
        .fork(`${fixtures}/file.js`)

        // check exists
        .file(`${fixtures}/file/not-exist.md`)
        .end();
    }, /not-exist.md to be exists/);
  });

  it('should check notFile', async () => {
    await runner()
      .cwd(tmpDir)
      .fork(`${fixtures}/file.js`)

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
        .fork(`${fixtures}/file.js`)

        // check exists
        .notFile(`${fixtures}/file/not-exist.md`, 'abc')
        .end();
    }, /not-exist.md to be exists/);

    await utils.assert.rejects(async () => {
      await runner()
        .cwd(tmpDir)
        .fork(`${fixtures}/file.js`)

        // check exists
        .notFile(`${fixtures}/file/README.md`, 'this is a README')
        .end();
    }, /file.*README\.md.*this is.*should not includes 'this is a README'/);
  });

});
