import path from 'path';
import fs from 'fs';
import runner from '../lib/runner.js';
import * as utils from './test-utils.js';

describe('test/middleware.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');
  const tmpDir = utils.getTempDir(expect);
  const filePath = path.resolve(tmpDir, 'middleware.md');

  beforeEach(() => utils.initDir(tmpDir));

  it('should support middleware', async () => {
    utils.assertFile.fail(filePath);

    await runner()
      .middleware(async (ctx, next) => {
        fs.appendFileSync(filePath, '1');
        await next();
        fs.appendFileSync(filePath, '5');
      })
      .middleware(async (ctx, next) => {
        fs.appendFileSync(filePath, '2');
        await next();
        fs.appendFileSync(filePath, '4');
      })
      .cwd(fixtures)
      .env('targetPath', filePath)
      .fork('./middleware.js')
      .end();

    // check
    utils.assertFile(filePath, '12345');
  });

  it('should always fork after middleware', async () => {
    utils.assertFile.fail(filePath);

    await runner()
      .middleware(async (ctx, next) => {
        fs.appendFileSync(filePath, '1');
        await next();
        fs.appendFileSync(filePath, '5');
      })

      .fork('./middleware.js')

      .middleware(async (ctx, next) => {
        fs.appendFileSync(filePath, '2');
        await next();
        fs.appendFileSync(filePath, '4');
      })
      .cwd(fixtures)
      .env('targetPath', filePath)
      .end();

    // check
    utils.assertFile(filePath, '12345');
  });
});
