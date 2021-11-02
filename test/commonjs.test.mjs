import assert from 'assert';
import path from 'path';
import { runner } from '../lib/esm/runner.js';

describe('test/commonjs.test.cjs', () => {
  const fixtures = path.resolve('test/fixtures');

  it('should support import', async () => {
    assert(runner);
    console.log('this is commonjs');
  });

  it('should support fork', async () => {
    await runner()
      .fork(`${fixtures}/version.js`)
      .log('result.stdout')
      .stdout(/\d+\.\d+\.\d+/)
      .end();
  });

  it('should support spawn', async () => {
    await runner()
      .spawn('npm -v')
      .log('result.stdout')
      .stdout(/\d+\.\d+\.\d+/)
      .end();
  });
});
