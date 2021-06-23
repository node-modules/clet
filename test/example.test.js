import request from 'supertest';
import runner from '../lib/runner.js';
import * as utils from './test-utils.js';

describe('test/example.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');
  const tmpDir = utils.getTempDir(expect);

  beforeEach(() => utils.initDir(tmpDir));

  it('should works with boilerplate', async () => {
    await runner()
      .cwd(tmpDir)
      .spawn('npm init')
      .stdin(/name:/, 'example\n') // wait for stdout, then respond
      .stdin(/version:/, new Array(9).fill('\n')) // don't care about others, just enter
      .stdout(/"name": "example"/) // validate stdout
      .file('package.json', { name: 'example', version: '1.0.0' }) // validate file content
      .code(0) // validate exitCode
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

  it('should works with long-run apps', async () => {
    await runner()
      .cwd(fixtures)
      .fork('server.js')
      .wait('stdout', /server started/)
      .expect(async () => {
        return request('http://localhost:3000')
          .get('/')
          .query({ name: 'tz' })
          .expect(200)
          .expect('hi, tz');
      })
      // .request('http://localhost:3000', { path: '/?name=tz' }, async ({ ctx, text }) => {
      //   const result = await text();
      //   ctx.assert.equal(result, 'hi, tz');
      // })
      .kill() // long-run server will not auto exit, so kill it manually after test
      .end();
  });
});
