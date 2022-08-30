import { it, describe, beforeEach, afterEach, expect, vi } from 'vitest';
import { runner, KEYS } from '../lib/runner.js';
import * as utils from './test-utils.js';

describe('test/operation.test.js', () => {
  beforeEach(() => {
    for (const name of [ 'error', 'warn', 'info', 'log', 'debug' ]) {
      vi.spyOn(global.console, name);
    }
  });

  afterEach(() => {
    vi.resetAllMocks();
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
      .spawn('npm init')
      .stdin(/name:/, 'example')
      .stdin(/version:/, new Array(9).fill(KEYS.ENTER))
      .file('package.json', { name: 'example', version: '1.0.0' })
      .shell('npm test', { reject: false })
      .shell('node --no-exists', { reject: false })
      .shell('echo "dont collect this log"', { reject: false, collectLog: false })
      .shell('node --no-collect', { reject: false, collectLog: false })
      .sleep(100)
      // should also collect shell output
      .stdout('no test specified')
      .stderr('bad option: --no-exists')
      .notStdout('dont collect this log')
      .notStderr('bad option: --no-collect');
  }, 10000);

  it.only('should support log()', async () => {
    await runner()
      .spawn('npm -v')
      .log('stdout: %s, code: %d', 'result.stdout', 'result.code')
      .log('result');

    console.warn('@@@ "%s"...', console.info.calls.join('\n'));
    expect(console.info).toHaveBeenCalledWith(expect.stringMatching(/\[CLET\] stdout: \d+\.\d+\.\d+, code: 0/));
    expect(console.info).toHaveBeenCalledWith(expect.stringMatching(/\[CLET\] \{ stdout:.*/));
  });
});
