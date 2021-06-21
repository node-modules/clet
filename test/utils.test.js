import fs from 'fs';
import * as utils from '../lib/utils';
const { assert } = utils;


describe('test/utils.test.js', () => {
  it('is', () => {
    assert(utils.is.object({}));
  });

  it('mkdirp and rm', async () => {
    const tmpDir = utils.resolve(import.meta, '.tmp/utils/a');

    assert(!fs.existsSync(tmpDir));
    await utils.mkdir(tmpDir);
    assert(fs.existsSync(tmpDir));

    await utils.rm(tmpDir);
    assert(!fs.existsSync(tmpDir));
  });

  it('resolve meta', async () => {
    const p = utils.resolve(import.meta, '../test', './fixtures');
    const isExist = await utils.exists(p);
    assert(isExist);
  });

  it('resolve', async () => {
    const p = utils.resolve('test', './fixtures');
    assert(fs.existsSync(p));
  });

  it.skip('sleep', async () => {
    const start = Date.now();
    await utils.sleep(1000);
    assert(Date.now() - start >= 1000);
  });

  it('filterAndJoin', () => {
    assert(utils.filterAndJoin([ 1, undefined, 2, null, 3 ]), '1 2 3');
    assert(utils.filterAndJoin([ undefined, 1, 2, null, 3 ], ','), '1,2,3');
  });
});
