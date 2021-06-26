
import path from 'path';
import request from 'supertest';
import runner, { KEYS } from '../lib/runner.js';
import * as utils from './test-utils.js';

describe('test/example.test.js', () => {
  const fixtures = path.resolve('test/fixtures');
  const tmpDir = utils.getTempDir();

  beforeEach(() => utils.initDir(tmpDir));

  it('should works with boilerplate', async () => {
    await runner()
      .cwd(tmpDir, { init: true })
      .spawn('npm init')
      .stdin(/name:/, 'example') // wait for stdout, then respond
      .stdin(/version:/, new Array(9).fill(KEYS.ENTER)) // don't care about others, just enter
      .stdout(/"name": "example"/) // validate stdout
      .file('package.json', { name: 'example', version: '1.0.0' }); // validate file content, relative to cwd
  });

  it('should works with command-line apps', async () => {
    const baseDir = path.resolve(fixtures, 'example');
    await runner()
      .cwd(baseDir)
      .fork('bin/cli.js', [ '--name=test' ], { execArgv: [ '--no-deprecation' ] })
      .stdout('this is example bin')
      .stdout(`cwd=${baseDir}`)
      .stdout(/argv=\["--name=\w+"\]/)
      .stdout(/execArgv=\["--no-deprecation"\]/)
      .stderr(/this is a warning/);
  });

  it('should works with long-run apps', async () => {
    const baseDir = path.resolve(fixtures, 'server');
    await runner()
      .cwd(baseDir)
      .fork('bin/cli.js')
      .wait('stdout', /server started/)
      .expect(async () => {
        return request('http://localhost:3000')
          .get('/')
          .query({ name: 'tz' })
          .expect(200)
          .expect('hi, tz');
      })
      .kill(); // long-run server will not auto exit, so kill it manually after test
  });
});
