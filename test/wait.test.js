import runner from '../lib/runner';
import * as utils from './utils';
import path from 'path';

describe('test/wait.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');
  const tmpDir = utils.getTempDir(expect);

  beforeEach(() => utils.initDir(tmpDir));

  it('should wait close', async () => {
    const filePath = path.join(tmpDir, 'event.md');

    await runner()
      .cwd(fixtures)
      .env('filePath', filePath)
      .fork('./wait.js')
      .wait('close')
      .code(0)
      .notFile(filePath) // will del when exit
      .end();
  });

  it('should wait close as default', async () => {
    const filePath = path.join(tmpDir, 'event.md');

    await runner()
      .cwd(fixtures)
      .env('filePath', filePath)
      .fork('./wait.js')
      .wait()
      .code(0)
      .notFile(filePath) // will del when exit
      .end();
  });

  it('should wait stdout', async () => {
    const filePath = path.join(tmpDir, 'event.md');

    await runner()
      .cwd(fixtures)
      .env('filePath', filePath)
      .notFile(filePath)
      .fork('./wait.js')
      .notFile(filePath)
      .wait('stdout', /egg started/)
      .file(filePath)
      .wait('close')
      .code(0)
      .notFile(filePath) // will del when exit
      .end();
  });

  it('should wait stderr', async () => {
    const filePath = path.join(tmpDir, 'event.md');

    await runner()
      .cwd(fixtures)
      .env('filePath', filePath)
      .notFile(filePath)
      .fork('./wait.js')
      .notFile(filePath)
      .wait('stderr', /be careful/)
      .file(filePath)
      .wait('close')
      .code(0)
      .notFile(filePath) // will del when exit
      .end();
  });

  it('should wait message with object', async () => {
    const filePath = path.join(tmpDir, 'event.md');

    await runner()
      .cwd(fixtures)
      .env('filePath', filePath)
      .notFile(filePath)
      .fork('./wait.js')
      .notFile(filePath)
      .wait('message', { action: 'egg-ready' })
      .file(filePath)
      .wait('close')
      .code(0)
      .notFile(filePath) // will del when exit
      .end();
  });

  it('should wait message with fn', async () => {
    const filePath = path.join(tmpDir, 'event.md');

    await runner()
      .cwd(fixtures)
      .env('filePath', filePath)
      .notFile(filePath)
      .fork('./wait.js')
      .notFile(filePath)
      .wait('message', data => {
        return data && data.action === 'egg-ready';
      })
      .file(filePath)
      .wait('close')
      .code(0)
      .notFile(filePath) // will del when exit
      .end();
  });

  it('should wait message with string', async () => {
    const filePath = path.join(tmpDir, 'event.md');

    await runner()
      .cwd(fixtures)
      .env('filePath', filePath)
      .notFile(filePath)
      .fork('./wait.js')
      .notFile(filePath)
      .wait('message', /egg-ready/)
      .file(filePath)
      .wait('close')
      .code(0)
      .notFile(filePath) // will del when exit
      .end();
  });

  it('should wait end if message is not emit', async () => {
    const filePath = path.join(tmpDir, 'event.md');

    await runner()
      .cwd(fixtures)
      .env('filePath', filePath)
      .notFile(filePath)
      .fork('./wait.js')
      .notFile(filePath)
      .wait('message', /not-exist-event/)
      .code(0)
      .notFile(filePath) // will del when exit
      .end();
  });

  it('should auto wait end without calling .wait()', async () => {
    const filePath = path.join(tmpDir, 'event.md');

    await runner()
      .cwd(fixtures)
      .env('filePath', filePath)
      .notFile(filePath)
      .fork('./wait.js')
      .code(0)
      .notFile(filePath) // will del when exit
      .end();
  });
});
