import path from 'path';
import { strict as assert } from 'assert';
import { runner, WaitType, TestRunnerContext, Runner } from '../src/runner';

describe('test/wait.test.js', () => {
  const fixtures = path.resolve('test/fixtures');
  const cliPath = path.join(fixtures, 'wait.js');

  type timestamp = number;

  interface customPlugin {
    time(this: customRunner, label: string): customRunner,
    timeEnd(this: customRunner, label: string, fn: (cost: number, start?: timestamp, now?: timestamp) => void): customRunner
  }

  interface customRunner extends Runner {
    ctx: TestRunnerContext & {
      timeMapping: {
        [key: string]: timestamp
      }
    },
    time(): Runner,
    timeEnd(fn: (cost: number, start?: timestamp, now?: timestamp) => void): Runner
  }

  const timePlugin: customPlugin = {
    time(label = 'default') {
      return this.tap(() => {
        this.ctx.timeMapping = this.ctx.timeMapping || {};
        this.ctx.timeMapping[label] = Date.now();
      }) as customRunner;
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
      }) as customRunner;
    },
  };

  it('should wait stdout', async () => {
    await (((runner()
      .register(timePlugin)
      .cwd(fixtures) as customRunner)
      .time()
      .fork(cliPath) as customRunner)
      .timeEnd((cost: number) => assert(cost < 500, `Expected ${cost} < 500`))
      .wait(WaitType.stdout, /started/) as customRunner)
      .timeEnd(cost => assert(cost > 500, `Expected ${cost} > 500`))
      .kill();
  });

  it('should wait stderr', async () => {
    await (((runner()
      .register(timePlugin)
      .cwd(fixtures) as customRunner)
      .time()
      .fork(cliPath) as customRunner)
      .timeEnd(cost => assert(cost < 500, `Expected ${cost} < 500`))
      .wait(WaitType.stderr, /be careful/) as customRunner)
      .timeEnd(cost => assert(cost > 500, `Expected ${cost} > 500`))
      .kill();
  });

  it('should wait message with object', async () => {
    await (((runner()
      .register(timePlugin)
      .cwd(fixtures) as customRunner)
      .time()
      .fork(cliPath) as customRunner)
      .timeEnd(cost => assert(cost < 500))
      .wait(WaitType.message, { action: 'egg-ready' }) as customRunner)
      .timeEnd(cost => assert(cost > 500))
      .kill();
  });

  it('should wait message with regex', async () => {
    await (((runner()
      .register(timePlugin)
      .cwd(fixtures) as customRunner)
      .time()
      .fork(cliPath) as customRunner)
      .timeEnd(cost => assert(cost < 500))
      .wait(WaitType.message, /egg-ready/) as customRunner)
      .timeEnd(cost => assert(cost > 500))
      .kill();
  });

  it('should wait message with fn', async () => {
    await (((runner()
      .register(timePlugin)
      .cwd(fixtures) as customRunner)
      .time()
      .fork(cliPath) as customRunner)
      .timeEnd(cost => assert(cost < 500))
      .wait(WaitType.message, (data: any) => data && data.action === 'egg-ready') as customRunner)
      .timeEnd(cost => assert(cost > 500))
      .kill();
  });

  it('should wait close', async () => {
    await runner()
      .cwd(fixtures)
      .fork(cliPath)
      .wait(WaitType.close)
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
      .wait(WaitType.message, /not-exist-event/)
      .code(0);
  });

  it('should auto wait end without calling .wait()', async () => {
    await runner()
      .cwd(fixtures)
      .fork(cliPath)
      .code(0);
  });
});
