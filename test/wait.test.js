import runner from '../lib/runner.js';
import * as utils from './test-utils.js';
import path from 'path';
const { assert } = utils;

describe('test/wait.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');
  const tmpDir = utils.getTempDir(expect);
  const cliPath = path.join(fixtures, 'wait.js');

  beforeEach(() => utils.initDir(tmpDir));

  it('should wait stdout', async () => {
    await runner()
      .register(utils.timePlugin)
      .cwd(tmpDir)
      .time()
      .fork(cliPath)
      .timeEnd(cost => assert(cost < 500))
      .wait('stdout', /started/)
      .timeEnd(cost => assert(cost > 500))
      .kill()
      .end();
  });

  it('should wait stderr', async () => {
    await runner()
      .register(utils.timePlugin)
      .cwd(tmpDir)
      .time()
      .fork(cliPath)
      .timeEnd(cost => assert(cost < 500))
      .wait('stderr', /be careful/)
      .timeEnd(cost => assert(cost > 500))
      .kill()
      .end();
  });

  it('should wait message with object', async () => {
    await runner()
      .register(utils.timePlugin)
      .cwd(tmpDir)
      .time()
      .fork(cliPath)
      .timeEnd(cost => assert(cost < 500))
      .wait('message', { action: 'egg-ready' })
      .timeEnd(cost => assert(cost > 500))
      .kill()
      .end();
  });

  it('should wait message with regex', async () => {
    await runner()
      .register(utils.timePlugin)
      .cwd(tmpDir)
      .time()
      .fork(cliPath)
      .timeEnd(cost => assert(cost < 500))
      .wait('message', /egg-ready/)
      .timeEnd(cost => assert(cost > 500))
      .kill()
      .end();
  });

  it('should wait message with fn', async () => {
    await runner()
      .register(utils.timePlugin)
      .cwd(tmpDir)
      .time()
      .fork(cliPath)
      .timeEnd(cost => assert(cost < 500))
      .wait('message', data => data && data.action === 'egg-ready')
      .timeEnd(cost => assert(cost > 500))
      .kill()
      .end();
  });

  it('should wait close', async () => {
    await runner()
      .cwd(fixtures)
      .fork(cliPath)
      .wait('close')
      .code(0)
      .end();
  });

  it('should wait close as default', async () => {
    await runner()
      .cwd(fixtures)
      .fork(cliPath)
      .wait()
      .code(0)
      .end();
  });

  it('should wait end if message is not emit', async () => {
    await runner()
      .cwd(fixtures)
      .fork(cliPath)
      .wait('message', /not-exist-event/)
      .code(0)
      .end();
  });

  it('should auto wait end without calling .wait()', async () => {
    await runner()
      .cwd(fixtures)
      .fork(cliPath)
      .code(0)
      .end();
  });
});
