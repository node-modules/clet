import * as utils from '../lib/utils';
import { strict as assert } from 'assert';
import fs from 'fs';

describe('test/utils.test.js', () => {
  it('is', () => {
    assert(utils.is.object({}));
  });

  it('mkdirp and del', async () => {
    const tmpDir = utils.resolve(import.meta, '.tmp/utils/a');

    assert(!fs.existsSync(tmpDir));
    await utils.mkdir(tmpDir);
    assert(fs.existsSync(tmpDir));

    await utils.del(tmpDir);
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

  it('sleep', async () => {
    const start = Date.now();
    await utils.sleep(1000);
    assert(Date.now() - start >= 1000);
  });

  it('filterAndJoin', () => {
    assert(utils.filterAndJoin([ 1, undefined, 2, null, 3 ]), '1 2 3');
    assert(utils.filterAndJoin([ undefined, 1, 2, null, 3 ], ','), '1,2,3');
  });
});
