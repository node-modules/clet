import runner from '../lib/runner';
import * as utils from './utils';

describe('test/example.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');
  const tmpDir = utils.getTempDir(expect);

  beforeEach(() => utils.initDir(tmpDir));

  it('should works with boilerplate scene', async () => {
    await runner()
      .cwd(tmpDir)
      .spawn('npm init')
      .stdin(/name:/, 'example\n')
      .stdin(/version:/, new Array(9).fill('\n')) // don't care about others, just enter
      .stdout(/"name": "example"/)
      .file('package.json', { name: 'example', version: '1.0.0' })
      .code(0)
      .end();
  });

  it('should works with command-line apps', async () => {
    await runner()
      .cwd(fixtures)
      .fork('example.js', [ '--name=test' ], { execArgv: [ '--no-deprecation' ] })
      .stdout('this is example bin')
      .stdout(/argv: \["--name=\w+"\]/)
      .stdout(/execArgv: \["--no-deprecation"\]/)
      .stderr(/this is a warning/)
      .code(0)
      .end();
  });

  it('should works with long-run server', async () => {
    await runner()
      .cwd(fixtures)
      .fork('server.js')
      .wait('stdout', /server started/)
      .request('http://localhost:3000', { path: '/?name=tz' }, async ({ ctx, text }) => {
        const result = await text();
        ctx.assert.equal(result, 'hi, tz');
      })
      .kill() // long-run server will not auto exit, so kill it manually after test
      .end();
  });
});
