import runner from '../lib/runner.js';
import * as utils from './test-utils.js';

describe('test/prompt.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');

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

  it('should work', async () => {
    await runner()
      .cwd(fixtures)
      .fork('./prompt.js')
      .stdin(/Name:/, 'tz\n')
      .stdin(/Email:/, 'tz@eggjs.com\n')
      .stdout(/Name:/)
      .stdout(/Email:/)
      .stdout(/Author: tz <tz@eggjs.com>/)
      .code(0)
      .end();
  });

  it('should support multi respond', async () => {
    await runner()
      .cwd(fixtures)
      .fork('./prompt.js')
      .stdin(/Name:/, [ 'tz\n', 'tz@eggjs.com\n' ])
      .stdout(/Name:/)
      .stdout(/Email:/)
      .stdout(/Author: tz <tz@eggjs.com>/)
      .code(0)
      .end();
  });

  // it('should work no matter stdin order', async () => {
  //   await runner()
  //     .cwd(fixtures)
  //     .fork('./prompt.js')
  //     .stdin(/Email:/, 'tz@eggjs.com\n')
  //     .stdin(/Name:/, 'tz\n')
  //     .stdout(/Name:/)
  //     .stdout(/Email:/)
  //     .stdout(/Author: tz <tz@eggjs.com>/)
  //     .code(0)
  //     .end();
  // });

  // it('should work with extra stdin', async () => {
  //   await runner()
  //     .cwd(fixtures)
  //     .fork('./prompt.js')
  //     .stdin(/Email:/, 'tz@eggjs.com\n')
  //     .stdin(/Name:/, 'tz\n')
  //     .stdin(/Description:/, 'this is a test\n')
  //     .stdout(/Name:/)
  //     .stdout(/Email:/)
  //     .stdout(/Author: tz <tz@eggjs.com>/)
  //     .log('result.stdout')
  //     .code(0)
  //     .end();
  // });

  it.skip('should handle error', async () => {
    await runner()
      .cwd(fixtures)
      .fork('./prompt.js')
      .on('spawn', ({ proc }) => {
        console.log(proc);
        // proc.stdin.end();
        // proc.stdin.destroy();
      })
      .stdin(/Name:/, 'tz\n')
      .stdout(/Author: tz <tz@eggjs.com>/)
      .code(0)
      .end();
  });
});
