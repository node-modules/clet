import runner from '../lib/runner.js';
import * as utils from './test-utils.js';

describe('test/command.test.js', () => {
  const fixtures = utils.resolve(import.meta, 'fixtures');

  describe('fork', () => {
    it('should fork', async () => {
      await runner()
        .cwd(fixtures)
        .fork('./command.js')
        .stdout(/version=v\d+\.\d+\.\d+/)
        .end();
    });

    it('should fork with args', async () => {
      await runner()
        .cwd(fixtures)
        .fork('./command.js', [ '--name=tz' ])
        .stdout(/argv=.*--name=tz/)
        .end();
    });

    it('should fork with opts', async () => {
      await runner()
        .cwd(fixtures)
        .fork('./command.js', { nodeOptions: [ '--no-deprecation' ] })
        .stdout(/argv=\[]/)
        .stdout(/execArgv=\["--no-deprecation"]/)
        .end();
    });

    it('should fork with args + env', async () => {
      await runner()
        .cwd(fixtures)
        .fork('./command.js', [ '--name=tz' ], { execArgv: [ '--no-deprecation' ] })
        .stdout(/argv=.*--name=tz/)
        .stdout(/execArgv=\["--no-deprecation"]/)
        .end();
    });

    it('should fork with env merge', async () => {
      await runner()
        .cwd(fixtures)
        .env('a', 1)
        .fork('./command.js', { env: { logEnv: 'PATH,a,b', b: 2 } })
        .stdout(/env.a=1/)
        .stdout(/env.b=2/)
        .stdout(/env.PATH=/)
        .end();
    });
  });

  describe('spawn', () => {
    it('should spawn shell', async () => {
      await runner()
        .cwd(fixtures)
        .spawn('node -v')
        .stdout(/^v\d+\.\d+\.\d+/)
        .end();
    });
    it('should spawn with args', async () => {
      await runner()
        .cwd(fixtures)
        .spawn('node', [ './command.js' ])
        .stdout(/version=v\d+\.\d+\.\d+/)
        .end();
    });

    it('should spawn without separated args', async () => {
      await runner()
        .cwd(fixtures)
        .env('a', 1)
        .spawn('node ./command.js', { env: { logEnv: 'PATH,a,b', b: 2 } })
        .stdout(/version=v\d+\.\d+\.\d+/)
        .stdout(/env.a=1/)
        .stdout(/env.b=2/)
        .stdout(/env.PATH=/)
        .end();
    });

    it('should spawn with opts', async () => {
      await runner()
        .cwd(fixtures)
        .env('a', 1)
        .spawn('node', [ './command.js' ], { env: { logEnv: 'PATH,a,b', b: 2 } })
        .stdout(/version=v\d+\.\d+\.\d+/)
        .stdout(/env.a=1/)
        .stdout(/env.b=2/)
        .stdout(/env.PATH=/)
        .end();
    });
  });
});
