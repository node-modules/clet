# CLET - Command Line E2E Testing

[![NPM Version](https://img.shields.io/npm/v/clet.svg?style=flat-square)](https://npmjs.org/package/clet)
[![NPM Quality](http://npm.packagequality.com/shield/clet.svg?style=flat-square)](http://packagequality.com/#?package=clet)
[![NPM Download](https://img.shields.io/npm/dm/clet.svg?style=flat-square)](https://npmjs.org/package/clet)
[![CI](https://github.com/node-modules/clet/actions/workflows/nodejs.yml/badge.svg)](https://github.com/node-modules/clet/actions/workflows/nodejs.yml)
[![Coverage](https://img.shields.io/codecov/c/github/node-modules/clet.svg?style=flat-square)](https://codecov.io/gh/node-modules/clet)

**CLET** = **C**ommand **L**ine **E**2E **T**esting.

**Aiming to make end-to-end testing for command-line apps as simple as possible.**

- Powerfull and Simply chainable APIs.
- Interactive with prompts.
- Modern && ESM first.

Inspired by [coffee](https://github.com/node-modules/coffee) / [nixt](https://github.com/vesln/nixt).


## How it looks

### Boilerplate && Prompts

```js
import { runner, KEYS } from 'clet';

it('should works with boilerplate', async () => {
  await runner()
    .cwd('/path/to/dir', { init: true })
    .spawn('npm init')
    .stdin(/name:/, 'example') // wait for stdout, then respond
    .stdin(/version:/, new Array(9).fill(KEYS.ENTER)) // don't care about others, just enter
    .stdout(/"name": "example"/) // validate stdout
    .file('package.json', { name: 'example', version: '1.0.0' }); // validate file content
});
```

### Command Line Apps

```js
import { runner } from 'clet';

it('should works with command-line apps', async () => {
  const baseDir = path.resolve(fixtures, 'example');
  await runner()
    .cwd(baseDir)
    .fork('bin/cli.js', [ '--name=test' ], { execArgv: [ '--no-deprecation' ] })
    .stdout('this is example bin')
    .stdout(`cwd=${baseDir}`)
    .stdout(/argv=\["--name=\w+"\]/)
    .stdout(/execArgv=\["--no-deprecation"\]/)
    .stderr(/this is a warning/);
});
```

### Build tools && Long-run server

```js
import { runner } from 'clet';
import request from 'supertest';

it('should works with long-run apps', async () => {
  const baseDir = path.resolve(fixtures, 'server');
  await runner()
    .cwd(baseDir)
    .fork('bin/cli.js')
    .wait('stdout', /server started/)
    .expect(async () => {
      // using supertest
      return request('http://localhost:3000')
        .get('/')
        .query({ name: 'tz' })
        .expect(200)
        .expect('hi, tz');
    })
    .kill(); // long-run server will not auto exit, so kill it manually after test
});
```

## Installation

```bash
npm i --save clet
```

## Command

### fork(cmd, args, opts)

Execute a Node.js script as a child process.

```js
it('should fork', async () => {
  await runner()
    .cwd(fixtures)
    .fork('example.js', [ '--name=test' ], { execArgv: [ '--no-deprecation' ] })
    .stdout('this is example bin')
    .stdout(/argv=\["--name=\w+"\]/)
    .stdout(/execArgv=\["--no-deprecation"\]/)
    .stderr(/this is a warning/)
    .code(0);
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
    .spawn('node -v')
    .stdout(/v\d+\.\d+\.\d+/)
    .code(0);
});
```

### cwd(dir)

Change the current working directory.

> Notice: it will affect `fork()` script relative path, `file()`, `mkdir()` etc.

```js
it('support cwd()', async () => {
  await runner()
    .cwd(targetDir)
    .fork(cliPath);
});
```

Support options:

- `init`: will delete and create directory before test.
- `clean`: will delete directory after test.

> Use `trash` instead of `fs.rm` due to the consideration of preventing misoperation.

```js
it('support cwd() with opts', async () => {
  await runner()
    .cwd(targetDir, { init: true, clean: true })
    .fork(cliPath)
    .notFile('should-delete.md')
    .file('test.md', /# test/);
});
```

### env(key, value)

Set environment variables.

> Notice: if you don't want to extend the environment variables, set `opts.extendEnv` to false.

```js
it('support env', async () => {
  await runner()
    .env('DEBUG', 'CLI')
    .fork('./example.js', [], { extendEnv: false });
});
```

### timeout(ms)

Set a timeout, will kill SIGTERM then SIGKILL.

```js
it('support timeout', async () => {
  await runner()
    .timeout(5000)
    .fork('./example.js');
});
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
    .kill();
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
    .kill();
});
```

### stdin(expected, respond)

Detect a prompt, then respond to it.

- `expected`: {String|RegExp} - test `stdout` with regexp match or string includes.
- `respond`: {String|Array} - respond content, if set to array then write each with a delay

You could use `KEYS.UP` / `KEYS.DOWN` to respond to choices prompt.

```js
import { runner, KEYS } from '../lib/runner.js';

it('should support stdin respond', async () => {
  await runner()
    .cwd(fixtures)
    .fork('./prompt.js')
    .stdin(/Name:/, 'tz')
    .stdin(/Email:/, 'tz@eggjs.com')
    .stdin(/Gender:/, [ KEYS.DOWN + KEYS.DOWN ])
    .stdout(/Author: tz <tz@eggjs.com>/)
    .stdout(/Gender: unknown/)
    .code(0);
});
```

---

## Validator

### stdout(expected)

Validate stdout, support `regexp` and `string.includes`.

```js
it('should support stdout()', async () => {
  await runner()
    .spawn('node -v')
    .stdout(/v\d+\.\d+\.\d+/) // regexp match
    .stdout(process.version)  // string includes;
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
    .stderr('this is a warning');
});
```

### notStderr(unexpected)

Opposite of `stderr()`

### code(n)

Validate process exit code.

will auto check whether proc is exit unexpected by default, so only use this if you want to validate fail exitCode.

> Notice: when proc is kill, exit code maybe undefined if you don't hook signal events.

```js
it('should support code()', async () => {
  await runner()
    .spawn('node --unknown-argv')
    .code(1);
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
    .cwd('/path/to/dir', { init: true })
    .spawn('npm init -y')
    .file('package.json')
    .file('package.json', /"name":/)
    .file('package.json', { name: 'example', config: { port: 8080 } });
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
    });
});
```

---

## Operation

### log(key)

Print log for debugging, support formator and dot path.

```js
it('should support log()', async () => {
  await runner()
    .spawn('node -v')
    .log('result: %j', 'result')
    .log('result.stdout')
    .stdout(/v\d+\.\d+\.\d+/);
});
```

### tap(fn)

Tap a method to chain sequence.

```js
it('should support tap()', async () => {
  await runner()
    .spawn('node -v')
    .tap(async ({ result, assert}) => {
      assert(result.stdout, /v\d+\.\d+\.\d+/);
    });
});
```

### sleep(ms)

```js
it('should support sleep()', async () => {
  await runner()
    .fork(cliPath)
    .sleep(2000)
    .log('result.stdout');
});
```

### shell

Run a shell, useful for `npm install` after boilerplate init.

```js
it('should support shell', async () => {
  await runner()
    .cwd('/path/to/dir', { init: true })
    .spawn('npm init -y')
    .file('package.json', { name: 'shell', version: '1.0.0' })
    .shell('npm version minor --no-git-tag-version')
    .file('package.json', { version: '1.1.0' });
});
```

### mkdir

Act like `mkdir -p`.

```js
it('should support mkdir', async () => {
  await runner()
    .cwd(tmpDir, { init: true })
    .mkdir('a/b')
    .file('a/b')
    .spawn('npm -v');
});
```

### rm

Move dir/file to trash.

```js
it('should support rm', async () => {
  await runner()
    .cwd(tmpDir, { init: true })
    .mkdir('a/b')
    .rm('a/b')
    .notFile('a/b')
    .spawn('npm -v');
});
```

### writeFile

Write content to file, support JSON and PlainText.

```js
it('should support writeFile', async () => {
  await runner()
    .cwd(tmpDir, { init: true })
    .writeFile('test.json', { name: 'writeFile' })
    .writeFile('test.md', 'this is a test')
    .file('test.json', /"name": "writeFile"/)
    .file('test.md', /this is a test/)
    .spawn('npm -v');
});
```

## Context

```js
/**
 * @typedef Context
 *
 * @property {Object} result - child process execute result
 * @property {String} result.stdout - child process stdout
 * @property {String} result.stderr - child process stderr
 * @property {Number} result.code - child process exit code
 *
 * @property {execa.ExecaChildProcess} proc - child process instance
 * @property {TestRunner} instance - runner instance
 * @property {String} cwd - child process current workspace directory
 *
 * @property {Object} assert - assert helper
 * @property {Object} utils -  utils helper
 * @property {Object} logger - built-in logger
 */
```

### assert

Extend Node.js built-in `assert` with some powerfull assertions.

```js
/**
 * assert the `actual` is match `expected`
 *  - when `expected` is regexp, detect by `RegExp.test`
 *  - when `expected` is json, detect by `lodash.ismatch`
 *  - when `expected` is string, detect by `String.includes`
 *
 * @param {String|Object} actual - actual string
 * @param {String|RegExp|Object} expected - rule to validate
 */
function matchRule(actual, expected) {}

/**
 * assert the `actual` is not match `expected`
 *  - when `expected` is regexp, detect by `RegExp.test`
 *  - when `expected` is json, detect by `lodash.ismatch`
 *  - when `expected` is string, detect by `String.includes`
 *
 * @param {String|Object} actual - actual string
 * @param {String|RegExp|Object} expected - rule to validate
 */
function doesNotMatchRule(actual, expected) {}

/**
 * validate file
 *
 *  - `matchFile('/path/to/file')`: check whether file exists
 *  - `matchFile('/path/to/file', /\w+/)`: check whether file match regexp
 *  - `matchFile('/path/to/file', 'usage')`: check whether file includes specified string
 *  - `matchFile('/path/to/file', { version: '1.0.0' })`: checke whether file content partial includes specified JSON
 *
 * @param {String} filePath - target path to validate, could be relative path
 * @param {String|RegExp|Object} [expected] - rule to validate
 * @throws {AssertionError}
 */
async function matchFile(filePath, expected) {}

/**
 * validate file with opposite rule
 *
 *  - `doesNotMatchFile('/path/to/file')`: check whether file don't exists
 *  - `doesNotMatchFile('/path/to/file', /\w+/)`: check whether file don't match regex
 *  - `doesNotMatchFile('/path/to/file', 'usage')`: check whether file don't includes specified string
 *  - `doesNotMatchFile('/path/to/file', { version: '1.0.0' })`: checke whether file content don't partial includes specified JSON
 *
 * @param {String} filePath - target path to validate, could be relative path
 * @param {String|RegExp|Object} [expected] - rule to validate
 * @throws {AssertionError}
 */
async function doesNotMatchFile(filePath, expected) {}
```

### debug(level)

Set level of logger.

```js
import { runner, LogLevel } from 'clet';

it('should debug(level)', async () => {
  await runner()
    .debug(LogLevel.DEBUG)
    // .debug('DEBUG')
    .spawn('npm -v');
});
```

---

## Extendable

### use(fn)

Middleware, always run before child process chains.

```js
// middleware.pre -> before -> fork -> running -> after -> end -> middleware.post -> cleanup

it('should support middleware', async () => {
  await runner()
    .use(async (ctx, next) => {
      // pre
      await utils.rm(dir);
      await utils.mkdir(dir);

      await next();

      // post
      await utils.rm(dir);
    })
    .spawn('npm -v');
});
```

### register(Function|Object)

Register your custom APIs.

```js
it('should register(fn)', async () => {
  await runner()
    .register(({ ctx }) => {
      ctx.cache = {};
      cache = function(key, value) {
        this.ctx.cache[key] = value;
        return this;
      };
    })
    .cache('a', 'b')
    .tap(ctx => {
      console.log(ctx.cache);
    })
    .spawn('node', [ '-v' ]);
});
```

## Known Issues

**Help Wanted**

- when answer prompt with `inquirer` or `enquirer`, stdout will recieve duplicate output.
- when print child error log with `.error()`, the log order maybe in disorder.

## License

MIT
