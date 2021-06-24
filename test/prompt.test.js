
import path from 'path';
import runner, { KEYS } from '../lib/runner.js';
import * as utils from './test-utils.js';

const { assert } = utils;

describe('test/prompt.test.js', () => {
  const fixtures = path.resolve('test/fixtures');

  it('should work with readline', async () => {
    await runner()
      .cwd(fixtures)
      .fork('./readline.js')
      .stdin(/Name:/, 'tz\n')
      .stdin(/Email:/, 'tz@eggjs.com\n')
      .stdout(/Name:/)
      .stdout(/Email:/)
      .stdout(/Author: tz <tz@eggjs.com>/)
      .code(0)
      .end();
  });

  it('should work with prompt', async () => {
    await runner()
      .cwd(fixtures)
      .fork('./prompt.js')
      .stdin(/Name:/, 'tz\n')
      .stdin(/Email:/, 'tz@eggjs.com\n')
      .stdin(/Gender:/, [ KEYS.DOWN, KEYS.ENTER ])
      .stdout(/Author: tz <tz@eggjs.com>/)
      .stdout(/Gender: girl/)
      .code(0)
      .end();
  });

  it('should support multi respond', async () => {
    await runner()
      .cwd(fixtures)
      .fork('./prompt.js')
      .stdin(/Name:/, [ 'tz\n', 'tz@eggjs.com\n', '\n' ])
      .stdout(/Author: tz <tz@eggjs.com>/)
      .stdout(/Gender: boy/)
      .code(0)
      .end();
  });


  it('should throw when process exit before the prompt is resolve', async () => {
    await assert.rejects(async () => {
      await runner()
        .cwd(fixtures)
        .fork('./prompt.js')
        .stdin(/Name:/, 'tz\n')
        .stdin(/Email:/, 'tz@eggjs.com\n')
        .stdin(/Gender:/, '\n')
        .stdin(/Unknown:/, 'still wait\n')
        .stdout(/Author: tz <tz@eggjs.com>/)
        .code(1)
        .end();
    }, /wait for prompt, but proccess is terminate/);
  });
});
