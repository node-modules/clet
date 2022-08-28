import { it, describe, beforeEach } from 'vitest';
import path from 'path';
import { strict as assert } from 'assert';
import { runner } from '../lib/runner.js';
import * as utils from './test-utils.js';

describe('test/runner.test.js', () => {
  const fixtures = path.resolve('test/fixtures');
  const tmpDir = utils.getTempDir();

  beforeEach(() => utils.initDir(tmpDir));

  it('should work with end()', async () => {
    const ctx = await runner()
      .cwd(fixtures)
      .spawn('node -v')
      .code(0)
      .end();

    // ensure chain return instance context
    assert.equal(ctx.instance.constructor.name, 'TestRunner');
  });

  it('should work without end()', async () => {
    const ctx = await runner()
      .cwd(fixtures)
      .spawn('node -v');

    // ensure chain return instance context
    assert.equal(ctx.instance.constructor.name, 'TestRunner');
  });

  it('should logger', async () => {
    await runner()
      .cwd(fixtures)
      .log('logger test start')
      .fork('logger.js')
      .stdout(/v\d+\.\d+\.\d+/)
      .log('logger test end');
  });

  it('should logger only error', async () => {
    // TODO: validate
    await runner()
      .cwd(fixtures)
      .debug()
      .debug('WARN')
      .log('logger test start')
      .fork('logger.js')
      .stdout(/v\d+\.\d+\.\d+/)
      .log('logger test end');
  });

  it('should support catch()', async () => {
    await runner()
      .spawn('node --no-exist-args')
      .catch(err => {
        assert.match(err.message, /bad option: --no-exist-args/);
      });
  });

  it('should export context', async () => {
    await runner()
      .cwd(fixtures)
      .env('a', 'b')
      .spawn('node -v')
      .tap(ctx => {
        ctx.assert(ctx.cwd === fixtures);
        ctx.assert(ctx.env.a === 'b');
        ctx.assert(ctx.proc);
        ctx.assert(ctx.result);
      });
  });
});
