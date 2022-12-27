import fs from 'fs';
import path from 'path';
import { strict as assert } from 'assert';
import * as utils from '../src/lib/utils';
import * as testUtils from '../test-old/test-utils';

describe('test/utils.test.ts', () => {
  const tmpDir = path.join(__dirname, './tmp');

  beforeEach(() => testUtils.initDir(tmpDir));

  it('types', () => {
    assert(utils.types.isString('foo'));
    assert(utils.types.isObject({}));
    assert(utils.types.isFunction(() => {}));
  });

  it('validate', () => {
    assert(utils.validate('foo', /fo+/));
    assert(utils.validate('foo', 'o'));
    assert(utils.validate({ name: 'test', config: { port: 8080 } }, { config: { port: 8080 } }));
    assert(utils.validate('foo', x => x.startsWith('f')));
    assert(utils.validate('foo', [ /fo+/, 'o' ]));
  });

  it('isParent', () => {
    const cwd = process.cwd();
    const file = path.join(cwd, 'index.js');
    assert(utils.isParent(cwd, file));
    assert(!utils.isParent(file, cwd));
    assert(!utils.isParent(cwd, cwd));
  });

  it('mkdirp and rm', async () => {
    const targetDir = path.resolve(tmpDir, './a');

    assert(!fs.existsSync(targetDir));
    await utils.mkdir(targetDir);
    assert(fs.existsSync(targetDir));

    await utils.rm(targetDir);
    assert(!fs.existsSync(targetDir));
  });

  it('writeFile', async () => {
    const targetDir = path.resolve(tmpDir, './b');
    await utils.mkdir(targetDir);

    const fileName = `${targetDir}/test-${Date.now()}.md`;
    await utils.writeFile(`${tmpDir}/${fileName}.md`, 'this is a test');
    assert(fs.readFileSync(`${tmpDir}/${fileName}.md`, 'utf-8') === 'this is a test');

    await utils.writeFile(`${tmpDir}/${fileName}.json`, { name: 'test' });
    assert(fs.readFileSync(`${tmpDir}/${fileName}.json`, 'utf-8').match(/"name": "test"/));

    await utils.mkdir(targetDir);
  });

  it('exists', async () => {
    assert(await utils.exists('package.json'));
    assert(!await utils.exists('not-exists-file'));
  });

  // it('resolve meta', async () => {
  //   const p = utils.resolve(import.meta, '../test', './fixtures');
  //   const isExist = await utils.exists(p);
  //   assert(isExist);
  // });

  it('resolve', async () => {
    const p = utils.resolve('test', './fixtures');
    assert(fs.existsSync(p));
  });

  it('sleep', async () => {
    const start = Date.now();
    await utils.sleep(1000);
    assert(Date.now() - start >= 1000);
  });
});
