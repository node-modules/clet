![CLET - Command Line E2E Testing](https://socialify.git.ci/node-modules/clet/image?description=1&descriptionEditable=_______________%20Command%20Line%20E2E%20Testing%20_______________%20%20%20%20%20%20%20%20%20%20%20%20%20%20%F0%9F%92%AA%20Powerful%20%2B%20%F0%9F%9A%80%20Simplified%20%2B%20%F0%9F%8E%A2%20Modern%20&font=Source%20Code%20Pro&language=1&owner=1&theme=Dark)

# CLET - Command Line E2E Testing

[![NPM Version](https://img.shields.io/npm/v/clet.svg?style=flat-square)](https://npmjs.org/package/clet)
[![NPM Download](https://img.shields.io/npm/dm/clet.svg?style=flat-square)](https://npmjs.org/package/clet)
[![NPM Quality](http://npm.packagequality.com/shield/clet.svg?style=flat-square)](http://packagequality.com/#?package=clet)
[![GitHub Actions CI](https://github.com/node-modules/clet/actions/workflows/nodejs.yml/badge.svg)](https://github.com/node-modules/clet/actions/workflows/nodejs.yml)
[![Coverage](https://img.shields.io/codecov/c/github/node-modules/clet.svg?style=flat-square)](https://codecov.io/gh/node-modules/clet)


**CLET aims to make end-to-end testing for command-line apps as simple as possible.**

- Powerful, stop writing util functions yourself.
- Simplified, every API is chainable.
- Modern, ESM first, but not leaving commonjs behind.

Inspired by [coffee](https://github.com/node-modules/coffee) and [nixt](https://github.com/vesln/nixt).


## How it looks

### Boilerplate && prompts

```js
import { runner, KEYS } from 'clet';

it('should works with boilerplate', async () => {
  await runner()
    .cwd(tmpDir, { init: true })
    .spawn('npm init')
    .stdin(/name:/, 'example') // wait for stdout, then respond
    .stdin(/version:/, new Array(9).fill(KEYS.ENTER))
    .stdout(/"name": "example"/) // validate stdout
    .notStderr(/npm ERR/)
    .file('package.json', { name: 'example', version: '1.0.0' }) // validate file
});
```

### Command line apps

```js
import { runner } from 'clet';

it('should works with command-line apps', async () => {
  const baseDir = path.resolve('test/fixtures/example');
  await runner()
    .cwd(baseDir)
    .fork('bin/cli.js', [ '--name=test' ], { execArgv: [ '--no-deprecation' ] })
    .stdout('this is example bin')
    .stdout(`cwd=${baseDir}`)
    .stdout(/argv=\["--name=\w+"\]/)
    .stderr(/this is a warning/);
});
```

### Build tools && Long-run servers

```js
import { runner } from 'clet';
import request from 'supertest';

it('should works with long-run apps', async () => {
  await runner()
    .cwd('test/fixtures/server')
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

### Work with CommonJS

```js
describe('test/commonjs.test.cjs', () => {
  it('should support spawn', async () => {
    const { runner } = await import('clet');
    await runner()
      .spawn('npm -v')
      .log('result.stdout')
      .stdout(/\d+\.\d+\.\d+/);
  });
});
```

## Installation

```bash
$ npm i --save clet
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
    .stderr(/this is a warning/);
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
    .stdout(/v\d+\.\d+\.\d+/);
});
```

### cwd(dir, opts)

Change the current working directory.

> Notice: it affects the relative path in `fork()`, `file()`, `mkdir()`, etc.

```js
it('support cwd()', async () => {
  await runner()
    .cwd(targetDir)
    .fork(cliPath);
});
```

Support options:

- `init`: delete and create the directory before tests.
- `clean`: delete the directory after tests.

> Use `trash` instead of `fs.rm` to prevent misoperation.

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

Set a timeout. Your application would receive `SIGTERM` and `SIGKILL` in sequent order.

```js
it('support timeout', async () => {
  await runner()
    .timeout(5000)
    .fork('./example.js');
});
```

### wait(type, expected)

Wait for your expectations to pass. It's useful for testing long-run apps such as build tools or http servers.

- `type`: {String} - support `message` / `stdout` / `stderr` / `close`
- `expected`: {String|RegExp|Object|Function}
  - {String}: check whether the specified string is included
  - {RegExp}: check whether it matches the specified regexp
  - {Object}: check whether it partially includes the specified JSON
  - {Function}: check whether it passes the specified function

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

Kill the child process. It's useful for manually ending long-run apps after validation.

> Notice: when kill, exit code may be undefined if the command doesn't hook on signal event.

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

Responde to a prompt input.

- `expected`: {String|RegExp} - test if `stdout` includes a string or matches regexp.
- `respond`: {String|Array} - content to respond. CLET would write each with a delay if an array is set.

You could use `KEYS.UP` / `KEYS.DOWN` to respond to a prompt that has multiple choices.

```js
import { runner, KEYS } from 'clet';

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

> Tips: type ENTER repeatedly if needed

```js
it('should works with boilerplate', async () => {
  await runner()
    .cwd(tmpDir, { init: true })
    .spawn('npm init')
    .stdin(/name:/, 'example')
    .stdin(/version:/, new Array(9).fill(KEYS.ENTER)) // don't care about others, just enter
    .stdout(/"name": "example"/)
    .notStderr(/npm ERR/)
    .file('package.json', { name: 'example', version: '1.0.0' })
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

The opposite of `stdout()`.

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

The opposite of `stderr()`.

### code(n)

Validate child process exit code.

No need to explicitly check if the process exits successfully, use `code(n)` only if you want to check other exit codes.

> Notice: when a process is killed, exit code may be undefined if you don't hook on signal events.

```js
it('should support code()', async () => {
  await runner()
    .spawn('node --unknown-argv')
    .code(1);
});
```

### file(filePath, expected)

Validate the file.

- `file(filePath)`: check whether the file exists
- `file(filePath, 'some string')`: check whether the file content includes the specified string
- `file(filePath, /some regexp/)`: checke whether the file content matches regexp
- `file(filePath, {})`: check whether the file content partially includes the specified JSON

```js
it('should support file()', async () => {
  await runner()
    .cwd(tmpDir, { init: true })
    .spawn('npm init -y')
    .file('package.json')
    .file('package.json', /"name":/)
    .file('package.json', { name: 'example', config: { port: 8080 } });
});
```

### notFile(filePath, unexpected)

The opposite of `file()`.

> Notice: `.notFile('not-exist.md', 'abc')` will throw because the file is not existing.

### expect(fn)

Validate with a custom function.

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

### log(format, ...keys)

Print log for debugging. `key` supports dot path such as `result.stdout`.

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

Tap a method to the chain sequence.

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

### shell(cmd, args, opts)

Run a shell script. For example, run `npm install` after boilerplate init.

```js
it('should support shell', async () => {
  await runner()
    .cwd(tmpDir, { init: true })
    .spawn('npm init -y')
    .file('package.json', { name: 'shell', version: '1.0.0' })
    .shell('npm version minor --no-git-tag-version', { reject: false })
    .file('package.json', { version: '1.1.0' });
});
```

The output log could validate by `stdout()` and `stderr()` by default, if you don't want this, just pass `{ collectLog: false }`.


### mkdir(path)

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

### rm(path)

Move a file or a folder to trash (instead of permanently delete it). It doesn't throw if the file or the folder doesn't exist.

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

### writeFile(filePath, content)

Write content to a file, support JSON and PlainText.

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

Extend Node.js built-in `assert` with some powerful assertions.

```js
/**
 * assert `actual` matches `expected`
 *  - when `expected` is regexp, assert by `RegExp.test`
 *  - when `expected` is json, assert by `lodash.isMatch`
 *  - when `expected` is string, assert by `String.includes`
 *
 * @param {String|Object} actual - actual string
 * @param {String|RegExp|Object} expected - rule to validate
 */
function matchRule(actual, expected) {}

/**
 * assert `actual` does not match `expected`
 *  - when `expected` is regexp, assert by `RegExp.test`
 *  - when `expected` is json, assert by `lodash.isMatch`
 *  - when `expected` is string, assert by `String.includes`
 *
 * @param {String|Object} actual - actual string
 * @param {String|RegExp|Object} expected - rule to validate
 */
function doesNotMatchRule(actual, expected) {}

/**
 * validate file
 *
 *  - `matchFile('/path/to/file')`: check whether the file exists
 *  - `matchFile('/path/to/file', /\w+/)`: check whether the file content matches regexp
 *  - `matchFile('/path/to/file', 'usage')`: check whether the file content includes the specified string
 *  - `matchFile('/path/to/file', { version: '1.0.0' })`: checke whether the file content partially includes the specified JSON
 *
 * @param {String} filePath - target path to validate, could be relative path
 * @param {String|RegExp|Object} [expected] - rule to validate
 * @throws {AssertionError}
 */
async function matchFile(filePath, expected) {}

/**
 * validate file with opposite rule
 *
 *  - `doesNotMatchFile('/path/to/file')`: check whether the file exists
 *  - `doesNotMatchFile('/path/to/file', /\w+/)`: check whether the file content does not match regex
 *  - `doesNotMatchFile('/path/to/file', 'usage')`: check whether the file content does not include the specified string
 *  - `doesNotMatchFile('/path/to/file', { version: '1.0.0' })`: checke whether the file content does not partially include the specified JSON
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
