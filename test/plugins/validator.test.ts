import assert from 'node:assert/strict';
import { runner } from '../../src/index';

describe.only('test/plugins/validator.test.ts', () => {
  it.only('should stdout() / stderr()', async () => {
    await runner()
      .spawn('node1', ['-p', 'process.version', '--inspect'])
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
        assert.equal(ctx.result.code, 0);
      })
      .end();

    await assert.rejects(async () => {
      await runner()
        .spawn('npm', ['-v'])
        .expect(ctx => {
          assert.equal(ctx.result.code, 1);
        })
        .end();
    }, /Expected values to be strictly equal/);
  });

  describe('error stack', () => {
    it.only('should correct error stack', async function test_stack() {
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
