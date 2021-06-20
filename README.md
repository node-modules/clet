# btr

another bin test runer

[![NPM Version](https://img.shields.io/npm/v/btr.svg?style=flat-square)](https://npmjs.org/package/btr)
[![NPM Quality](http://npm.packagequality.com/shield/btr.svg?style=flat-square)](http://packagequality.com/#?package=btr)
[![NPM Download](https://img.shields.io/npm/dm/btr.svg?style=flat-square)](https://npmjs.org/package/btr)

[![CI](https://github.com/node-modules/btr/actions/workflows/nodejs.yml/badge.svg)](https://github.com/node-modules/btr/actions/workflows/nodejs.yml)
[![Coverage](https://img.shields.io/codecov/c/github/node-modules/btr.svg?style=flat-square)](https://codecov.io/gh/node-modules/btr)

## Usage

```bash
npm i --save btr
```

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
- Tool
  - [ ] esm-first
  - [ ] prettier
  - [ ] semver-release
  - [x] jest

## Example

LifeCycle: `prepare -> middleware pre -> prompt -> run -> wait for ready/unready/end/timeout -> assertion -> wait for exit -> middleware post -> cleanup(kill) -> end`

```js
import runner from 'btr';

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
