import { resolve } from 'path';
import runner from '../lib/runner.js';
import * as utils from './test-utils.js';

describe('test/operation.test.js', () => {
  // const fixtures = utils.resolve(import.meta, 'fixtures');
  const tmpDir = utils.getTempDir();

  beforeEach(() => utils.initDir(tmpDir));

  it('should support mkdir', async () => {
    const targetPath = resolve(tmpDir, 'a/b');
    utils.assertFile.fail(targetPath);

    await runner()
      .cwd(tmpDir)
      .mkdir('a/b')
      .file(targetPath)
      .spawn('ls -l')
      .mkdir('a/b/c')
      .end();

    // check
    utils.assertFile(targetPath);
    utils.assertFile(resolve(targetPath, 'c'));
  });

  it.skip('should support shell', async () => {
    const targetPath = resolve(tmpDir, 'package.json');
    utils.assertFile.fail(targetPath);

    await runner()
      .cwd(tmpDir)
      .shell('npm init -y')
      .file(targetPath)
      .spawn('ls')
      .mkdir('a/b/c')
      .end();

    // check
    utils.assertFile(targetPath);
    utils.assertFile(resolve(targetPath, 'c'));
  });
});
