import { runner } from '../lib/runner.js';
import path from 'path';

describe('test/command.test.js', () => {
  const fixtures = path.resolve('test/fixtures/command');

  describe('fork', () => {
    it('should fork', async () => {
      await runner()
        .cwd(fixtures)
        .fork('./bin/cli.js')
        .stdout(/version=v\d+\.\d+\.\d+/)
        .stdout('xxxxxx')
        .stdout(`cwd=${fixtures}`);
    });

    it('should fork with args', async () => {
      await runner()
        .cwd(fixtures)
        .fork('./bin/cli.js', [ '--name=tz' ])
        .stdout(/argv=.*--name=tz/);
    });

    it('should fork with opts', async () => {
      await runner()
        .cwd(fixtures)
        .fork('./bin/cli.js', { nodeOptions: [ '--no-deprecation' ] })
        .stdout(/argv=\[]/)
        .stdout(/execArgv=\["--no-deprecation"]/);
    });

    it('should fork with args + env', async () => {
      await runner()
        .cwd(fixtures)
        .fork('./bin/cli.js', [ '--name=tz' ], { execArgv: [ '--no-deprecation' ] })
        .stdout(/argv=.*--name=tz/)
        .stdout(/execArgv=\["--no-deprecation"]/);
    });

    it('should fork with env merge', async () => {
      await runner()
        .cwd(fixtures)
        .env('a', 1)
        .fork('./bin/cli.js', { env: { logEnv: 'PATH,a,b', b: 2 } })
        .stdout(/env.a=1/)
        .stdout(/env.b=2/)
        .stdout(/env.PATH=/);
    });
  });

  describe('spawn', () => {
    it('should spawn shell', async () => {
      await runner()
        .cwd(fixtures)
        .spawn('node -v')
        .stdout(/^v\d+\.\d+\.\d+/);
    });
    it('should spawn with args', async () => {
      await runner()
        .cwd(fixtures)
        .spawn('node', [ './bin/cli.js' ])
        .stdout(/version=v\d+\.\d+\.\d+/)
        .stdout(`cwd=${fixtures}`);
    });

    it('should spawn without separated args', async () => {
      await runner()
        .cwd(fixtures)
        .env('a', 1)
        .spawn('node ./bin/cli.js', { env: { logEnv: 'PATH,a,b', b: 2 } })
        .stdout(/version=v\d+\.\d+\.\d+/)
        .stdout(/env.a=1/)
        .stdout(/env.b=2/)
        .stdout(/env.PATH=/);
    });

    it('should spawn with opts', async () => {
      await runner()
        .cwd(fixtures)
        .env('a', 1)
        .spawn('node', [ './bin/cli.js' ], { env: { logEnv: 'PATH,a,b', b: 2 } })
        .stdout(/version=v\d+\.\d+\.\d+/)
        .stdout(/env.a=1/)
        .stdout(/env.b=2/)
        .stdout(/env.PATH=/);
    });
  });
});
