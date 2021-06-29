import { jest, expect } from '@jest/globals';
import { runner } from '../lib/runner.js';
import * as utils from './test-utils.js';

describe('test/operation.test.js', () => {
  beforeEach(() => {
    for (const name of [ 'error', 'warn', 'info', 'log', 'debug' ]) {
      jest.spyOn(global.console, name);
    }
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const tmpDir = utils.getTempDir();

  it('should support mkdir()/rm()', async () => {
    await runner()
      .cwd(tmpDir, { init: true })
      .mkdir('a/b')
      .file('a/b')
      .rm('a/b')
      .file('a')
      .notFile('a/b')
      .spawn('npm -v');
  });

  it('should support writeFile()', async () => {
    await runner()
      .cwd(tmpDir, { init: true })
      .writeFile('test.json', { name: 'writeFile' })
      .writeFile('test.md', 'this is a test')
      .file('test.json', /"name": "writeFile"/)
      .file('test.md', /this is a test/)
      .spawn('npm -v');
  });

  it('should support shell()', async () => {
    await runner()
      .cwd(tmpDir, { init: true })
      .spawn('npm init -y')
      .file('package.json', { name: 'operation', version: '1.0.0' })
      .shell('npm version minor --no-git-tag-version')
      .file('package.json', { version: '1.1.0' })
      .shell('npm test', { reject: false })
      .sleep(100);
  });

  it('should support log()', async () => {
    await runner()
      .spawn('npm -v')
      .log('stdout: %s, code: %d', 'result.stdout', 'result.code')
      .log('result');

    expect(console.info).toHaveBeenCalledWith(expect.stringMatching(/\[CLET\] stdout: \d+\.\d+\.\d+, code: 0/));
    expect(console.info).toHaveBeenCalledWith(expect.stringMatching(/\[CLET\] \{ stdout:.*\}/));
  });
});
