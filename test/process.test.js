import path from 'path';
import { strict as assert } from 'assert';
import { runner } from '../lib/runner.js';
import * as utils from './test-utils.js';

describe('test/process.test.js', () => {
  const fixtures = path.resolve('test/fixtures');
  const tmpDir = utils.getTempDir();

  beforeEach(() => utils.initDir(tmpDir));

  it.todo('fork relative path');
  it.todo('fork bin path');

  it('should support expect()', async () => {
    await runner()
      .spawn('node -v')
      .expect(ctx => {
        const { assert, result } = ctx;
        assert.match(result.stdout, /v\d+\.\d+\.\d+/);
      });
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
      .code(0);
  });

  it('should support stdout()', async () => {
    await runner()
      .cwd(fixtures)
      .fork('process.js')
      .stdout(/version: v\d+\.\d+\.\d+/)
      .stdout('argv:')
      .notStdout('xxxx')
      .notStdout(/^abc/);
  });

  it('should support stderr()', async () => {
    await runner()
      .cwd(fixtures)
      .fork('process.js', [ '--error' ])
      .stderr(/an error/)
      .stderr('this is an error')
      .notStderr('xxxx')
      .notStderr(/^abc/);
  });

  it('should support code(0)', async () => {
    await runner()
      .cwd(fixtures)
      .fork('process.js')
      .code(0);
  });

  it('should support code(1)', async () => {
    await runner()
      .cwd(fixtures)
      .fork('process.js', [ '--fail' ])
      .code(1);
  });

  it('should double check code()', async () => {
    await runner()
      .cwd(fixtures)
      .fork('process.js', [ '--delay' ])
      .wait('stdout', /delay for a while/)
      .code(0);
  });

  it('should support code(fn)', async () => {
    await runner()
      .cwd(fixtures)
      .spawn('node --no-exists-argv')
      .code(n => n < 0);
  });

  it('should throw if not calling code() when proc fail', async () => {
    await assert.rejects(async () => {
      await runner()
        .cwd(fixtures)
        .fork('process.js', [ '--fail' ]);
    }, /Command failed with exit code 1/);
  });

  it('should timeout', async () => {
    await assert.rejects(async () => {
      await runner()
        .cwd(fixtures)
        .timeout(1000)
        .fork('long-run.js')
        .wait('stdout', /long run/)
        .sleep(2000);
    }, /timed out after 1000/);
  });

  it('should auto create cwd', async () => {
    const cliPath = path.resolve(fixtures, 'file.js');
    const targetDir = utils.getTempDir('../cwd-test');
    await utils.writeFile(path.join(targetDir, 'should-delete.md'), 'foo');

    // clean: false
    await runner()
      .cwd(targetDir, { init: true })
      .fork(cliPath)
      .notFile('should-delete.md')
      .file('test.md', /# test/);

    assert.equal(await utils.exists(targetDir), true);

    // clean: true
    await runner()
      .cwd(targetDir, { init: true, clean: true })
      .fork(cliPath)
      .file('test.md', /# test/);

    assert.equal(await utils.exists(targetDir), false);
  });

  it('should throw if auto create cwd will damage', async () => {
    const cliPath = path.resolve(fixtures, 'file.js');
    const targetDir = utils.getTempDir('../cwd-test-damage');

    await assert.rejects(async () => {
      await runner()
        .cwd(fixtures, { init: true, clean: true })
        .fork(cliPath);
    }, /rm.*too dangerous/);

    await assert.rejects(async () => {
      await runner()
        .cwd(path.dirname(cliPath), { init: true, clean: true })
        .fork(cliPath);
    }, /rm.*too dangerous/);

    // rm event fail
    await assert.rejects(async () => {
      await runner()
        .cwd(targetDir, { init: true, clean: true })
        .fork(cliPath)
        .file('test.md', /# test/)
        .tap(() => { throw new Error('trigger fail'); });
    }, /trigger fail/);

    assert.equal(await utils.exists(targetDir), false);
  });

  it('should kill', async () => {
    await runner()
      .cwd(fixtures)
      .fork('long-run.js')
      .wait('stdout', /long run/)
      .kill()
      // .stdout(/recieve SIGTERM/)
      .notStdout(/exit long-run/);
  });

  it('should ensure proc is kill if assert fail', async () => {
    await assert.rejects(async () => {
      await runner()
        .cwd(fixtures)
        .fork('long-run.js')
        .wait('stdout', /long run/)
        .tap(() => {
          throw new Error('fork trigger break');
        });
    }, /fork trigger break/);

    await assert.rejects(async () => {
      await runner()
        .cwd(fixtures)
        .spawn('node', [ 'long-run.js' ])
        .wait('stdout', /long run/)
        .tap(() => {
          throw new Error('spawn trigger break');
        });
    }, /spawn trigger break/);
  });
});
