import runner from '../lib/runner';
import * as utils from './utils';

describe('test/validator.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');

  it('should support expect()', async () => {
    await runner()
      .spawn('node -v')
      .expect(ctx => {
        const { assert, result } = ctx;
        assert.match(result.stdout, /v\d+\.\d+\.\d+/);
      })
      .end();
  });

  it('should support stdout()', async () => {
    await runner()
      .spawn('node -v')
      .stdout(/v\d+\.\d+\.\d+/)
      .stdout(process.version)
      .notStdout('xxxx')
      .notStdout(/^abc/)
      .end();
  });

  it('should support stderr()', async () => {
    await runner()
      .cwd(fixtures)
      .fork('example.js')
      .stderr(/a warning/)
      .stderr('this is a warning')
      .notStderr('xxxx')
      .notStderr(/^abc/)
      .end();
  });

  it('should support code()', async () => {
    await runner()
      .spawn('node -v')
      .code(0)
      .end();
  });
});
