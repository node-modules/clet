import path from 'path';
import request from 'supertest';
import { runner, KEYS, WaitType } from '../src/runner';
import * as utils from './test-utils';

describe('test/example.test.js', () => {
  it('should works with boilerplate', async () => {
    const tmpDir = utils.getTempDir('test', 'example');
    await runner()
      .cwd(tmpDir, { init: true })
      .spawn('npm init')
      .stdin(/name:/, 'example') // wait for stdout, then respond
      .stdin(/version:/, new Array(9).fill(KEYS.ENTER)) // don't care about others, just enter
      .stdout(/"name": "example"/) // validate stdout
      .file('package.json', { name: 'example', version: '1.0.0' }); // validate file content, relative to cwd
  });

  it('should works with command-line apps', async () => {
    const baseDir = path.resolve('test/fixtures/example');
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
    await runner()
      .cwd('test/fixtures/server')
      .fork('bin/cli.js')
      .wait(WaitType.stdout, /server started/)
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
