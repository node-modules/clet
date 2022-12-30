import assert from 'node:assert/strict';
import { runner } from '../src/index';

describe('test/runner.test.ts', () => {
  describe('process', () => {
    it('should spawn', async () => {
      await runner()
        .spawn('node', [ '-p', 'process.version', '--inspect' ])
        .stdout(/v\d+\.\d+\.\d+/)
        .notStdout('some text')
        .stderr(/Debugger listening on/)
        .notStderr('some error')
        .end();
    });

    it('should fork', async () => {
      await runner()
        .fork('test/fixtures/process/fork.ts')
        .stdout(/v\d+\.\d+\.\d+/)
        .notStdout('some text')
        .stderr(/this is testing/)
        .notStderr('some error')
        .end();
    });

    it('should color', async () => {
      await runner()
        .fork('test/fixtures/process/color.ts')
        .stdout(/CLIHub/)
        .end();
    });

    describe('code()', () => {
      it('should skip auto check code when .code(1)', async () => {
        await runner()
          .fork('test/fixtures/process/error.ts')
          .code(1)
          .end();
      });

      it('should auto check code when fail', async () => {
        await assert.rejects(async () => {
          await runner()
            .fork('test/fixtures/process/error.ts')
            .end();
        }, /Command failed with exit code 1/);
      });
    });

    it('should correct error stack', async function test_stack() {
      try {
        await runner()
          .spawn('npm', [ '-v' ])
          .stdout(/abc/)
          .end();
      } catch (err) {
        const index = err.stack!.indexOf('    at ');
        const lineEndIndex = err.stack!.indexOf('\n', index);
        const line = err.stack!.slice(index, lineEndIndex);
        // console.log(line);
        assert(line.startsWith('    at Context.test_stack'));
      }
    });

    // it.only('should wait stdout', async () => {
    //   await runner()
    //     .fork('test/fixtures/process/long-run.ts')
    //     .wait('stdout', /Server running at/)
    //     .stdout(/ready/)
    //     .end();
    // });

    it.skip('should not fail when spawn not exists', async () => {
      await runner()
        .spawn('not-exists')
        .stderr(/Cannot find module/)
        .end();
    });

    it.skip('should not fail when fork not exists', async () => {
      await runner()
        .fork('test/fixtures/not-exists.ts')
        .stderr(/Cannot find module/)
        .end();
    });
  });
});
