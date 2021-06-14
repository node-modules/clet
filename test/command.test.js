import runner from '../lib/runner';
import * as utils from './utils';

describe('test/command.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');

  it('should fork', async () => {
    const { ctx: { result } } = await runner()
      .cwd(fixtures)
      .fork('./version.js')
      .end();

    utils.assert.match(result.stdout, /^v\d+\.\d+\.\d+/);
  });

  it('should spawn', async () => {
    const { ctx: { result } } = await runner()
      .spawn('node', [ './version.js' ])
      .cwd(fixtures)
      .end();

    utils.assert.match(result.stdout, /^v\d+\.\d+\.\d+/);
  });

  // FIXME
  it.skip('should exec', async () => {
    const { ctx: { result } } = await runner()
      .exec('node ./version.js')
      .cwd(fixtures)
      .end();

    utils.assert.match(result.stdout, /^v\d+\.\d+\.\d+/);
  });

});
