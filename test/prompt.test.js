
import path from 'path';
import { strict as assert } from 'assert';
import { runner, KEYS } from '../lib/runner.js';

describe('test/prompt.test.js', () => {
  const fixtures = path.resolve('test/fixtures');

  it('should work with readline', async () => {
    await runner()
      .cwd(fixtures)
      .fork('./readline.js')
      .stdin(/Name:/, 'tz')
      .stdin(/Email:/, 'tz@eggjs.com')
      .stdout(/Name:/)
      .stdout(/Email:/)
      .stdout(/Author: tz <tz@eggjs.com>/);
  });

  it('should work with prompt', async () => {
    await runner()
      .cwd(fixtures)
      .fork('./prompt.js')
      .stdin(/Name:/, 'tz')
      .stdin(/Email:/, 'tz@eggjs.com')
      .stdin(/Gender:/, [ KEYS.DOWN + KEYS.DOWN ])
      .stdout(/Author: tz <tz@eggjs.com>/)
      .stdout(/Gender: unknown/);
  });

  it('should work with EOL', async () => {
    await runner()
      .cwd(fixtures)
      .fork('./prompt.js')
      .stdin(/Name:/, 'tz\n')
      .stdin(/Email:/, 'tz@eggjs.com\n')
      .stdin(/Gender:/, [ KEYS.DOWN + KEYS.DOWN + KEYS.ENTER ])
      .stdout(/Author: tz <tz@eggjs.com>/)
      .stdout(/Gender: unknown/);
  });

  it('should support multi respond', async () => {
    await runner()
      .cwd(fixtures)
      .fork('./prompt.js')
      .stdin(/Name:/, [ 'tz', 'tz@eggjs.com', '' ])
      .stdout(/Author: tz <tz@eggjs.com>/)
      .stdout(/Gender: boy/);
  });


  it('should throw when process exit before the prompt is resolve', async () => {
    await assert.rejects(async () => {
      await runner()
        .cwd(fixtures)
        .fork('./prompt.js')
        .env('throw', true)
        .stdin(/Name:/, 'tz\n')
        .stdin(/Email:/, 'tz@eggjs.com\n')
        .stdin(/Gender:/, '\n')
        .stdin(/Unknown:/, 'still wait\n')
        .stdout(/Author: tz <tz@eggjs.com>/);
    }, /wait for prompt, but proccess is terminate/);
  });
});
