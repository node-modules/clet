import { EOL } from 'os';
import execa from 'execa';
import stripAnsi from 'strip-ansi';
import debounce from 'lodash.debounce';
import pEvent from 'p-event';
import * as utils from './utils.js';

const { assert } = utils;

/**
 * set working directory
 *
 * @param {String} dir - working directory
 * @return {Runner} instance for chain
 */
export function cwd(dir) {
  this.ctx.cmdOpts.cwd = dir;
  return this;
}

/**
 * set environment variables.
 *
 * @param {String} key - env key
 * @param {String} value - env value
 * @return {Runner} instance for chain
 */
export function env(key, value) {
  this.ctx.cmdOpts.env[key] = value;
  return this;
}

/**
 * set a timeout, will kill SIGTERM then SIGKILL.
 *
 * @param {Number} ms - milliseconds
 * @return {Runner} instance for chain
 */
export function timeout(ms) {
  this.ctx.cmdOpts.timeout = ms;
  return this;
}

/**
 * cancel the proc.
 *
 * useful for manually end long-run server after validate.
 *
 * when kill, exit code maybe undefined if user don't hook signal event.
 *
 * @param {String} signal - signal event name
 * @param {Object} [options] - { forceKillAfterTimeout }
 * @see https://github.com/sindresorhus/execa#killsignal-options
 * @return {Runner} instance for chain
 */
export function kill(signal, options) {
  return this._addChain(async () => {
    this.proc.cancel(signal, options);
    await this.proc;
  });
}

/**
 * execute a Node.js script as a child process.
 *
 * @memberof Runner
 * @param {String} cmd - cmd string
 * @param {Array} [args] - cmd args
 * @param {execa.NodeOptions} [opts] - cmd options
 * @see https://github.com/sindresorhus/execa#options
 * @return {Runner} instance for chain
 */
export function fork(cmd, args, opts) {
  return this._registerCommand('fork', cmd, args, opts);
}

/**
  * execute a shell script as a child process.
  *
  * @memberof Runner
  * @param {String} cmd - cmd string
  * @param {Array} [args] - cmd args
  * @param {execa.NodeOptions} [opts] - cmd options
  * @return {Runner} runner instance
  */
export function spawn(cmd, args, opts) {
  assert(cmd, 'cmd is required');
  return this._registerCommand('spawn', cmd, args, opts);
}

export function _registerCommand(cmdType, cmd, cmdArgs, cmdOpts = {}) {
  assert(cmd, 'cmd is required');
  assert(!this.ctx.cmd, 'cmd had registered');

  // fork(cmd, cmdOpts)
  if (cmdArgs && !Array.isArray(cmdArgs)) {
    cmdOpts = cmdArgs;
    cmdArgs = undefined;
  }

  // alias
  if (cmdOpts.execArgv) {
    cmdOpts.nodeOptions = cmdOpts.nodeOptions || cmdOpts.execArgv;
    delete cmdOpts.execArgv;
  }

  // merge opts and env
  cmdOpts.env = { ...this.ctx.cmdOpts.env, ...cmdOpts.env };
  Object.assign(this.ctx.cmdOpts, cmdOpts);
  Object.assign(this.ctx, { cmd, cmdType, cmdArgs });

  return this;
}

export function _execCommand() {
  const { cmd, cmdType, cmdArgs = [], cmdOpts } = this.ctx;
  assert(cmd, 'cmd is required');

  if (cmdType === 'fork') {
    // TODO: check cmd is exists
    this.logger.info('fork %s %j', cmd, cmdOpts);
    this.proc = execa.node(cmd, cmdArgs, cmdOpts);
  } else {
    const cmdString = [ cmd, ...cmdArgs ].join(' ');
    this.logger.info('spawn %s %j', cmdString, cmdOpts);
    this.proc = execa.command(cmdString, cmdOpts);
  }

  this.proc.then(res => {
    // { command, escapedCommand, exitCode, stdout, stderr, all, failed, timedOut, isCanceled, killed }
    this.ctx.res = res;
    this.ctx.result.code = res.exitCode;
  });

  function log(logFn, content) {
    const arr = content.split(EOL);
    for (const str of arr) {
      logFn('  ' + str);
    }
  }

  this.proc.stdin.setEncoding('utf8');

  this.proc.stdout.on('data', data => {
    const content = stripAnsi(data.toString());
    this.ctx.result.stdout += content;
    log(this.logger.log, content);
    this.emit('stdout', content);
  });

  this.proc.stderr.on('data', data => {
    const content = stripAnsi(data.toString());
    this.ctx.result.stderr += content;
    log(this.logger.log, content);
    this.emit('stderr', content);
  });

  this.proc.on('spawn', () => {
    this.emit('spawn', this);
  });

  this.proc.on('message', data => {
    this.emit('message', data);
    this.logger.debug('message event:', data);
  });

  this.proc.once('close', code => {
    this.emit('close', code);
    this.logger.debug('close event:', code);
  });

  // TODO: enable by debug() and indent
  // this.proc.stdout.pipe(process.stdout);
  // this.proc.stderr.pipe(process.stderr);

  return this.proc;
}

export function _waitFor(type, expected) {
  let promise;

  switch (type) {
    case 'message': {
      promise = pEvent(this, 'message', {
        rejectionEvents: [ 'close' ],
        filter: input => utils.validate(input, expected),
      });
      break;
    }

    case 'stdout':
    case 'stderr': {
      promise = pEvent(this, type, {
        rejectionEvents: [ 'close' ],
        filter: () => {
          return utils.validate(this.ctx.result[type], expected);
        },
      });
      break;
    }

    case 'close':
    default: {
      promise = pEvent(this, 'close');
      break;
    }
  }
  return promise;
}

/**
 * wait for event then resume the chains
 *
 * @param {String} type - message/stdout/stderr/close
 * @param {String|RegExp|Object|Function} expected - rule to validate
 *  - {String}: check whether includes specified string
 *  - {RegExp}: check whether match regexp
 *  - {Object}: check whether partial includes specified JSON
 *  - {Function}: check whether with specified function
 * @return {Runner} instance for chain
 */
export function wait(type, expected) {
  this.options.autoWait = false;

  // watch immediately but await later in chains
  const promise = this._waitFor(type, expected);

  // await later in chains
  return this._addChain(async () => {
    try {
      await promise;
    } catch (err) {
      // don't treat close event as error as rejectionEvents
    }
  });
}

/**
 * Detect a prompt for user input, then respond to it.
 *
 * @param {String|RegExp} expected - test `stdout` with regexp match or string includes
 * @param {String|Array} respond - respond content, if set to array then write each with a delay.
 * @return {Runner} instance for chain
 */
export function stdin(expected, respond) {
  assert(expected, '`expected is required');
  assert(respond, '`respond is required');
  if (!Array.isArray(respond)) respond = [ respond ];
  this._promptList.push({
    expected,
    respond,
    match: input => utils.validate(input, expected),
  });
  return this;
}

/**
 * hook stdout event to respond to prompt
 */
export function hookPrompt() {
  const onPrompt = debounce(async function onPrompt() {
    for (const [ index, item ] of this._promptList.entries()) {
      const { match, respond } = item;
      if (match(this.ctx.result.stdout)) {
        this._promptList.splice(index, 1);

        // FIXME: when stdin.write, stdout will recieve duplicative output
        for (const str of respond) {
          this.proc.stdin.write(str);
          // wait a second
          await utils.sleep(100);
        }
        if (this._promptList.length === 0) this.proc.stdin.end();
        break;
      }
    }
  }, 200).bind(this);

  // hook event
  this.on('stdout', async () => {
    try {
      // respond to stdin
      onPrompt();
    } catch (err) {
      this.logger.error(`respond to stdin got error: ${err.message}`);
      throw err;
    }
  });
}
