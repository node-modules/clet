import { runner } from '../src/runner';

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
