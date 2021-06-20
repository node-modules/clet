import runner from '../lib/runner';
import { strict as assert } from 'assert';
import * as utils from './utils';

describe('test/process.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');
  const tmpDir = utils.getTempDir(expect);

  beforeEach(() => utils.initDir(tmpDir));

  it('should assert process', async () => {
    await runner()
      .cwd(fixtures)
      .fork(`${fixtures}/process.js`)
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
      .fork(`${fixtures}/process.js`, [ '--error' ])
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
        .fork(`${fixtures}/process.js`, [ '--fail' ])
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

  it('should timeout', async () => {
    await assert.rejects(async () => {
      await runner()
        .cwd(fixtures)
        .timeout(1000)
        .fork('long-run.js')
        .wait('stdout', /long run/)
        .sleep(2000)
        .end();
    }, /timed out after 1000/);
  });

  it('should kill', async () => {
    await runner()
      .cwd(fixtures)
      .fork('long-run.js')
      .wait('stdout', /long run/)
      .kill()
      .stdout(/recieve SIGTERM/)
      .notStdout(/exit long-run/)
      .end();
  });
});
