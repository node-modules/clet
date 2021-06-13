# ctu

cli test utils

[![NPM Version](https://img.shields.io/npm/v/ctu.svg?style=flat-square)](https://npmjs.org/package/ctu)
[![NPM Quality](http://npm.packagequality.com/shield/ctu.svg?style=flat-square)](http://packagequality.com/#?package=ctu)
[![NPM Download](https://img.shields.io/npm/dm/ctu.svg?style=flat-square)](https://npmjs.org/package/ctu)

[![CI](https://github.com/node-modules/ctu/actions/workflows/nodejs.yml/badge.svg)](https://github.com/node-modules/ctu/actions/workflows/nodejs.yml)
[![Coverage](https://img.shields.io/codecov/c/github/node-modules/ctu.svg?style=flat-square)](https://codecov.io/gh/node-modules/ctu)

## Usage

```bash
npm i --save ctu
```

## TODO

- RFC
  - [ ] API
  - [ ] context obj
  - [ ] stub
- Tool
  - [ ] esm-first
  - [ ] prettier
  - [ ] semver-release
  - [x] jest

## Example

LifeCycle: `prepare -> middleware pre -> prompt -> run -> wait for ready/unready/end/timeout -> assertion -> wait for exit -> middleware post -> end`

```js
ctu(opts)
  .middleware(async next => await next())
  .plugin(key, fn)
  .debug(level)
  .clone()

  // coverage?

  .mkdir(filePath)
  .rm(filePath)
  .writeFile(filePath, content)
  .writeFile(filePath, fn)
  .exec('git init') // whether detect as stdout ??

  .cwd(__dirname)
  .env(key, value)
  .timout(1)

  .beforeScript(filePath) // add to --require

  // .mockHttp()

  // execa
  .run(cmd, opts)

  .on(event, async ctx => {})

  .ready('egg-ready')
  // .ready(/egg started/)
  // .unready('start-fail')

  .stdin(respond)
  .stdin(match, respond)

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
  // supertest
  .request('/', opts, async () => {})
  // .get().post().put().del().head()

  .exit()

  .expect(fn)
  .notExpect(fn)

  .end(fn)
```


