# CLET

Command Line E2E Testing.

[![NPM Version](https://img.shields.io/npm/v/clet.svg?style=flat-square)](https://npmjs.org/package/clet)
[![NPM Quality](http://npm.packagequality.com/shield/clet.svg?style=flat-square)](http://packagequality.com/#?package=clet)
[![NPM Download](https://img.shields.io/npm/dm/clet.svg?style=flat-square)](https://npmjs.org/package/clet)

[![CI](https://github.com/node-modules/clet/actions/workflows/nodejs.yml/badge.svg)](https://github.com/node-modules/clet/actions/workflows/nodejs.yml)
[![Coverage](https://img.shields.io/codecov/c/github/node-modules/clet.svg?style=flat-square)](https://codecov.io/gh/node-modules/clet)


## How it looks

```js
import runner from 'clet';

describe('command-line end-to-end testing', () => {

  it('should works with boilerplate', async () => {
    await runner()
      .cwd(tmpDir)
      .spawn('npm init')
      .stdin(/name:/, 'example\n')  // wait for stdout, then respond
      .stdin(/version:/, new Array(9).fill('\n')) // don't care about others, just enter
      .stdout(/"name": "example"/)  // validate stdout
      .file('package.json', { name: 'example', version: '1.0.0' })  // validate file content
      .code(0) // validate exitCode
      .end();
  });

  it('should works with command-line apps', async () => {
    await runner()
      .cwd(fixtures)
      .fork('example.js', [ '--name=test' ], { execArgv: [ '--no-deprecation' ] })
      .stdout('this is example bin')
      .stdout(/argv: \["--name=\w+"\]/)
      .stdout(/execArgv: \["--no-deprecation"\]/)
      .stderr(/this is a warning/)
      .code(0)
      .end();
  });

  it('should works with long-run apps', async () => {
    await runner()
      .cwd(fixtures)
      .fork('server.js')
      .wait('stdout', /server started/) // wait for stdout, then resume validator chains
      .request('http://localhost:3000', { path: '/?name=tz' }, async ({ ctx, text }) => {
        const result = await text();
        ctx.assert.equal(result, 'hi, tz');
      })
      .kill() // long-run server will not auto exit, so kill it manually after test
      .end();
  });
});

```

## Installation

```bash
npm i --save clet
```

## API

### Validation

## License

## Usage


## TODO

- RFC
  - [ ] API
  - [ ] Docs
  - [ ] refactor plugin system
  - [ ] assert error stack
  - [ ] stub api
  - [ ] fn.length, next is optional?
  - [ ] tmpdir - mkdir + next + rm
  - [ ] private method to replace _fn
  - [ ] pipe stdout when debug, and indent
  - [ ] middleware mkdir
  - [ ] http api
- Tool
  - [ ] esm-first
  - [ ] prettier
  - [ ] semver-release
  - [x] jest

## Example

LifeCycle: `prepare -> middleware pre -> prompt -> run -> wait for ready/unready/end/timeout -> assertion -> wait for exit -> middleware post -> cleanup(kill) -> end`

```js
import runner from 'clet';

runner(opts)
  .middleware(async next => await next())
  .plugin(key, fn)
  .debug(level)
  .clone()

  // coverage?

  .mkdir(filePath, autoDelete)
  .rm(filePath)
  .writeFile(filePath, content)
  .writeFile(filePath, fn)
  .shell('git init') // whether detect as stdout ??

  .cwd(__dirname)
  .env(key, value)
  .timout(1)

  .beforeScript(filePath) // add to --require

  // .mockHttp()

  // execa
  .run(cmd, opts)

  .then(fn) // or tap?
  .inject('result.stdout') // or log?

  .on(event, async ctx => {})

  .ready('egg-ready') // or wait?
  // .ready(/egg started/)
  // .unready('start-fail')
  .wait(/egg started/)

  .wait('stdout', /egg started/)
  .wait('close')
  .wait('message', { action: 'egg-ready' })
  .wait('message', msg => msg && msg.action === 'egg-ready')

  .waitMessage(/egg-ready/)
  .waitMessage(msg => msg && msg.action === 'egg-ready')
  .waitStdout(/egg started/)

  .stdin(respond)
  .stdin(match, respond) // ~~watch stdout + stderr ?~~

  .stdout(/hello/)
  .stderr(/some error/)
  .code(1)
  .notStdout(/xxx/)
  .notStderr(/aaa/)

  // .curl(url, opts, fn)x
  // assert-file
  .file(filePath, /readme/)
  .notFile(filePath, /readme/)

  // impl at plugin
  .server(8080)
  // supertest or popsicle
  .request('/', opts, async () => {})
  // .get().post().put().del().head()

  .exit()

  .expect(async ctx => {})

  .end(fn)
```

```js
runner()
  .run('egg-scripts start')
  .stdout(/starting.../)
  .ready('egg-ready')
  .stdout(/egg started/)
  .file('logs/egg-web.log')
  .server(8080)
  .request('/', async ({ body }) => {
    assert(body === 'hi, egg');
  })
  .stdout(/request '/' router/)
  .expect(fn)
  .exit()
  .code(0)
  .end()
```
