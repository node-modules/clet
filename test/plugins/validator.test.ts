import assert from 'node:assert/strict';
import { runner } from '../../src/index';

describe('test/plugins/validator.test.ts', () => {
  it('should stdout() / stderr()', async () => {
    await runner()
      .spawn('node', ['-p', 'process.version', '--inspect'])
      .stdout(/v\d+\.\d+\.\d+/)
      .notStdout('some text')
      .stderr(/Debugger listening on/)
      .notStderr('some error')
      .end();

    await runner()
      .fork('test/fixtures/process/fork.ts')
      .stdout(/v\d+\.\d+\.\d+/)
      .notStdout('some text')
      .stderr(/this is testing/)
      .notStderr('some error')
      .end();
  });

  it('should expect()', async () => {
    await runner()
      .spawn('npm', ['-v'])
      .expect(ctx => {
        assert.equal(ctx.result.exitCode, 0);
      })
      .end();

    await assert.rejects(async () => {
      await runner()
        .spawn('npm', ['-v'])
        .expect(ctx => {
          assert.equal(ctx.result.exitCode, 1);
        })
        .end();
    }, /Expected values to be strictly equal/);
  });

  describe.only('error stack', () => {
    it('should correct error stack', async function test_stack() {
      try {
        await runner()
          .spawn('npm', ['-v'])
          .stdout(/abc/)
          .end();
      } catch (err) {
        console.error(err);
        const index = err.stack!.indexOf('    at ');
        const lineEndIndex = err.stack!.indexOf('\n', index);
        const line = err.stack!.slice(index, lineEndIndex);
        // console.log(line);
        assert(line.startsWith('    at Context.test_stack'));
      }
    });

    it('should not correct error stack', async function test_stack() {
      try {
        await runner()
          .spawn('npm', ['-v'])
          .expect(ctx => {
            assert.equal(ctx.result.stdout, 1);
          })
          .stdout(/abc/)
          .end();
      } catch (err) {
        console.error(err);
        const index = err.stack!.indexOf('    at ');
        const lineEndIndex = err.stack!.indexOf('\n', index);
        const line = err.stack!.slice(index, lineEndIndex);
        assert(line.startsWith('    at TestRunner.<anonymous>'));
      }
    });
  });
});
