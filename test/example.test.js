import runner from '../lib/runner';
import * as utils from './utils';

describe('test/example.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');
  const tmpDir = utils.getTempDir(expect);

  beforeEach(() => utils.initDir(tmpDir));

  it('should fork cli', async () => {
    await runner()
      .cwd(fixtures)
      .fork('./example.js', [ '--name=test' ])
      .stdout('this is example bin')
      .stdout(/--name=\w+/)
      .stderr(/this is a warning/)
      .code(0)
      .end();
  });

  it('should spawn command', async () => {
    await runner()
      .cwd(tmpDir)
      .spawn('npm init')
      .stdin(/name:/, [ 'example\n', '\n', 'this is an example\n', '\n', '\n', '\n', '\n', '\n', '\n', '\n' ])
      .stdout(/"name": "example"/)
      .file('package.json', { name: 'example' })
      .code(0)
      .end();
  });

  it('should test long-run server', async () => {
    await runner()
      .cwd(fixtures)
      .fork('server.js')
      .wait('stdout', /server started/)
      .request('http://localhost:3000', { path: '/?name=tz' }, async ({ ctx, body }) => {
        let res = '';
        for await (const data of body) {
          res += data.toString();
        }
        // TODO: when assert fail, don't kill pid
        ctx.assert.equal(res, 'hi, tz');
      })
      .log('>>> %j', 'result.stdout')
      .kill()
      .end();
  });
});
