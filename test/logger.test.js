import path from 'path';
import { runner } from '../lib/runner.js';

describe('test/logger.test.js', () => {
  const fixtures = path.resolve('test/fixtures');

  it('should logger', async () => {
    await runner()
      .cwd(fixtures)
      .log('logger test start')
      .fork('logger.js')
      .stdout(/v\d+\.\d+\.\d+/)
      .log('logger test end');
  });
});
