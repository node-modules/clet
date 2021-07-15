import path from 'path';
import { strict as assert } from 'assert';
import { runner } from '../lib/esm/runner.js';

describe('test/wait.test.js', () => {
  const fixtures = path.resolve('test/fixtures');
  const cliPath = path.join(fixtures, 'wait.js');
  const timePlugin = {
    time(label = 'default') {
      return this.tap(() => {
        this.ctx.timeMapping = this.ctx.timeMapping || {};
        this.ctx.timeMapping[label] = Date.now();
      });
    },
    timeEnd(label, fn) {
      if (typeof label === 'function') {
        fn = label;
        label = 'default';
      }
      return this.tap(() => {
        const start = this.ctx.timeMapping[label];
        const now = Date.now();
        const cost = now - start;
        fn(cost, start, now);
      });
    },
  };

  it('should wait stdout', async () => {
    await runner()
      .register(timePlugin)
      .cwd(fixtures)
      .time()
      .fork(cliPath)
      .timeEnd(cost => assert(cost < 500, `Expected ${cost} < 500`))
      .wait('stdout', /started/)
      .timeEnd(cost => assert(cost > 500, `Expected ${cost} > 500`))
      .kill();
  });

  it('should wait stderr', async () => {
    await runner()
      .register(timePlugin)
      .cwd(fixtures)
      .time()
      .fork(cliPath)
      .timeEnd(cost => assert(cost < 500, `Expected ${cost} < 500`))
      .wait('stderr', /be careful/)
      .timeEnd(cost => assert(cost > 500, `Expected ${cost} > 500`))
      .kill();
  });

  it('should wait message with object', async () => {
    await runner()
      .register(timePlugin)
      .cwd(fixtures)
      .time()
      .fork(cliPath)
      .timeEnd(cost => assert(cost < 500))
      .wait('message', { action: 'egg-ready' })
      .timeEnd(cost => assert(cost > 500))
      .kill();
  });

  it('should wait message with regex', async () => {
    await runner()
      .register(timePlugin)
      .cwd(fixtures)
      .time()
      .fork(cliPath)
      .timeEnd(cost => assert(cost < 500))
      .wait('message', /egg-ready/)
      .timeEnd(cost => assert(cost > 500))
      .kill();
  });

  it('should wait message with fn', async () => {
    await runner()
      .register(timePlugin)
      .cwd(fixtures)
      .time()
      .fork(cliPath)
      .timeEnd(cost => assert(cost < 500))
      .wait('message', data => data && data.action === 'egg-ready')
      .timeEnd(cost => assert(cost > 500))
      .kill();
  });

  it('should wait close', async () => {
    await runner()
      .cwd(fixtures)
      .fork(cliPath)
      .wait('close')
      .code(0);
  });

  it('should wait close as default', async () => {
    await runner()
      .cwd(fixtures)
      .fork(cliPath)
      .wait()
      .code(0);
  });

  it('should wait end if message is not emit', async () => {
    await runner()
      .cwd(fixtures)
      .fork(cliPath)
      .wait('message', /not-exist-event/)
      .code(0);
  });

  it('should auto wait end without calling .wait()', async () => {
    await runner()
      .cwd(fixtures)
      .fork(cliPath)
      .code(0);
  });
});
