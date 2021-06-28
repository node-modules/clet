import { resolve } from 'path';
import { runner } from '../lib/runner.js';
import * as utils from './test-utils.js';

describe('test/operation.test.js', () => {
  // const fixtures = path.resolve('test/fixtures');
  const tmpDir = utils.getTempDir();

  it.todo('operation');

  it.skip('should support mkdir', async () => {
    const targetPath = resolve(tmpDir, 'a/b');
    utils.assertFile.fail(targetPath);

    await runner()
      .cwd(tmpDir)
      .mkdir('a/b')
      .file(targetPath)
      .spawn('ls -l')
      .mkdir('a/b/c');

    // check
    utils.assertFile(targetPath);
    utils.assertFile(resolve(targetPath, 'c'));
  });

  it('should support shell', async () => {
    const tmpDir = utils.getTempDir('shell');

    await runner()
      .cwd(tmpDir, { init: true })
      .notFile('package.json')
      .shell('npm init -y')
      .file('package.json', { name: 'shell' })
      .spawn('npm -v');
  });
});
