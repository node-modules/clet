import { resolve } from 'path';
import fs from 'fs';
import runner from '../lib/runner';
import * as utils from './utils';

describe('test/operatation.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');
  const tmpDir = utils.getTempDir(expect);

  beforeEach(() => utils.initDir(tmpDir));

  it('should support mkdir', async () => {
    const targetPath = resolve(tmpDir, 'a/b');
    utils.assertFile.fail(targetPath);

    await runner()
      .cwd(tmpDir)
      .mkdir('a/b')
      .file(targetPath)
      .spawn('ls')
      .mkdir('a/b/c')
      .end();

    // check
    utils.assertFile(targetPath);
    utils.assertFile(resolve(targetPath, 'c'));
  });
});
