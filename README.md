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

### fork(cmd, args, opts)

Execute a Node.js script as a child process.

```js
it('should fork', async () => {
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
```

Options:

- `timeout`: {Number} - will kill after timeout.
- `execArgv`: {Array} - pass to child process's execArgv, default to `process.execArgv`.
- `cwd`: {String} - working directory, prefer to use `.cwd()` instead of this.
- `env`: {Object} - prefer to use `.env()` instead of this.
- `extendEnv`: {Boolean} - whether extend `process.env`, default to true.
- more detail: https://github.com/sindresorhus/execa#options

### spawn(cmd, args, opts)

Execute a shell script as a child process.

```js
it('should support spawn', async () => {
  await runner()
    .cwd(tmpDir)
    .spawn('node -v')
    .stdout(/v\d+\.\d+\.\d+/)
    .code(0)
    .end();
});
```

### end()

Finish chain packaging and start the test.

```js
it('should support spawn', async () => {
  await runner()
    .spawn('node -v')
    .stdout(/v\d+\.\d+\.\d+/)
    .code(0)
    .end();
});
```

### cwd(dir)

Change the current working directory.

> Notice: it will affect `fork()` script relative path, `file()`, `mkdir()` etc.

```js
runner()
  .cwd(fixtures)
  .fork('./example.js')
```
### env(key, value)

Set environment variables.

> Notice:  if you don't want to extend the environment variables, set `opts.extendEnv` to false.

```js
runner()
  .env('DEBUG', 'CLI')
  .fork('./example.js', [], { extendEnv: false })
```

### timeout(ms)

Set a timeout, will kill SIGTERM then SIGKILL.

```js
runner()
  .timeout(5000)
  .fork('./example.js')
```

### wait(type, expected)

Wait for some condition, then resume the chain, useful for tesing long-run http server apps.

- `type`: {String} - support `message` / `stdout` / `stderr` / `close`
- `expected`: {String|RegExp|Object|Function}
  - {String}: check whether includes specified string
  - {RegExp}: check whether match regexp
  - {Object}: check whether partial includes specified JSON
  - {Function}: check whether with specified function

> Notice: don't forgot to `wait('end')` or `kill()` later.

```js
it('should wait', async () => {
  await runner()
    .fork('./wait.js')
    .wait('stdout', /server started/)
    // .wait('message', { action: 'egg-ready' }) // ipc message
    .file('logs/web.log')
    .kill()
    .end();
});
```

### kill()

Kill the child process.

useful for manually end long-run server after validate.

> Notice: when kill, exit code maybe undefined if the command don't hook signal event.

```js
it('should kill() manually after test server', async () => {
  await runner()
    .cwd(fixtures)
    .fork('server.js')
    .wait('stdout', /server started/)
    .kill()
    .end();
});
```

### stdin(expected, respond)

Detect a prompt for user input, then respond to it.

- `expected`: {String|RegExp} - test `stdout` with regexp match or string includes
- `respond`: {String|Array} - respond content, if set to array then write each with a delay.

```js
it('should support stdin respomd', async () => {
  await runner()
    .cwd(tmpDir)
    .spawn('npm init')
    .stdin(/name:/, 'example\n')  // wait for stdout, then respond
    .stdin(/version:/, new Array(9).fill('\n')) // don't care about others, just enter
    .file('package.json', { name: 'example' })
    .end();
});
```

## Validator

### stdout(expected)

Validate stdout, support `regexp` and `string.includes`.

```js
it('should support stdout()', async () => {
  await runner()
    .spawn('node -v')
    .stdout(/v\d+\.\d+\.\d+/) // regexp match
    .stdout(process.version)  // string includes
    .end();
});
```

### notStdout(unexpected)

Opposite of `stdout()`

### stderr(expected)

Validate stdout, support `regexp` and `string.includes`.

```js
it('should support stderr()', async () => {
  await runner()
    .cwd(fixtures)
    .fork('example.js')
    .stderr(/a warning/)
    .stderr('this is a warning')
    .end();
});
```

### notStderr(unexpected)

Opposite of `stderr()`

### code(n)

Validate process exit code.

will auto check whether proc is exit unexpected by default, so only use this if you wan't to validate fail exitCode.

> Notice: when proc is kill, code maybe undefined if you don't hook Signal Events.

```js
it('should support code()', async () => {
  await runner()
    .spawn('node --unknown-argv')
    .code(1)
    .end();
});
```

### file(filePath, expected)

Validate file.

- `file(filePath)`: check whether file is exists
- `file(filePath, 'some string')`: check whether file content includes specified string
- `file(filePath, /some regexp/)`: checke whether file content match regexp
- `file(filePath, {})`: checke whether file content partial includes specified JSON

```js
it('should support file()', async () => {
  await runner()
    .cwd(tmpDir)
    .fork('npm init -y')
    .file('package.json')
    .file('package.json', /"name":/)
    .file('package.json', { name: 'example', config: { port: 8080 } })
    .end();
});
```

### notFile(filePath, unexpected)

Opposite of `file()`

> Notice: `.notFile('not-exist.md', 'abc')` will throw due to file is not exists.

### expect(fn)

Validate with custom function.

Provide useful assert method `ctx.assert`.

```js
it('should support expect()', async () => {
  await runner()
    .spawn('node -v')
    .expect(ctx => {
      const { assert, result } = ctx;
      assert.match(result.stdout, /v\d+\.\d+\.\d+/);
    })
    .end();
});
```

## Operation

### log

### tap

### sleep

### shell

### mkdir

### rm

### writeFile
### http

## Context

### assert

### logger

### debug(level)

## Unstable API

### middleware

### register

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
  - [ ] http api, wrap get/post, and body, query, contentType
  - [ ] stdin key mapping and auto add \n
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
