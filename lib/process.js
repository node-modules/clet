import execa from 'execa';
import stripAnsi from 'strip-ansi';
import debounce from 'lodash.debounce';
import pEvent from 'p-event';
import * as utils from './utils';

const { assert } = utils;

export function cwd(dir) {
  this.ctx.cmdOpts.cwd = dir;
  return this;
}

export function env(key, value) {
  this.ctx.cmdOpts.env[key] = value;
  return this;
}

export function timeout(ms) {
  this.ctx.cmdOpts.timeout = ms;
  return this;
}

export function kill(signal, options) {
  return this._addChain(async () => {
    // in this case, exitCode maybe undefined if user don't hook signal event
    this.proc.cancel(signal, options);
    await this.proc;
  });
}

/**
 * fork cli
 *
 * @memberof Runner
 * @param {String} cmd - cmd string
 * @param {Array} [args] - cmd args
 * @param {execa.NodeOptions} [opts] - cmd options
 * @return {Runner} runner instance
 */
export function fork(cmd, args, opts) {
  return this._registerCommand('fork', cmd, args, opts);
}

/**
  * spawn shell
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

  this.proc.stdin.setEncoding('utf8');

  const onPrompt = debounce(this._onPrompt, 200).bind(this);
  this.proc.stdout.on('data', async data => {
    const content = stripAnsi(data.toString());
    this.ctx.result.stdout += content;
    this.emit('stdout', content);
    try {
      // respond to stdin
      onPrompt();
    } catch (err) {
      this.logger.error(`respond to stdin got error: ${err.message}`);
      throw err;
    }
  });

  this.proc.stderr.on('data', data => {
    const content = stripAnsi(data.toString());
    this.ctx.result.stderr += content;
    this.emit('stderr', content);
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
  this.proc.stdout.pipe(process.stdout);
  this.proc.stderr.pipe(process.stderr);

  return this.proc;
}

export function wait(type, expected) {
  this.options.autoWait = false;
  let promise;

  // watch immediately but await later in chains
  switch (type) {
    case 'message': {
      const filterFn = utils.makeCheckFn(expected);

      promise = pEvent(this, 'message', {
        rejectionEvents: [ 'close' ],
        filter: filterFn,
      });
      break;
    }

    case 'stdout': {
      const filterFn = utils.makeCheckFn(expected);
      promise = pEvent(this, 'stdout', {
        rejectionEvents: [ 'close' ],
        filter: () => filterFn(this.ctx.result.stdout),
      });
      break;
    }

    case 'stderr': {
      const filterFn = utils.makeCheckFn(expected);
      promise = pEvent(this, 'stderr', {
        rejectionEvents: [ 'close' ],
        filter: () => filterFn(this.ctx.result.stderr),
      });
      break;
    }

    case 'close':
    default: {
      promise = pEvent(this, 'close');
      break;
    }
  }

  // await later in chains
  return this._addChain(async () => {
    try {
      await promise;
    } catch (err) {
      // don't treat close event as error as rejectionEvents
    }
  });
}

export function stdin(expected, respond) {
  assert(expected, '`expected is required');
  assert(respond, '`respond is required');
  if (!Array.isArray(respond)) respond = [ respond ];
  this._promptList.push({
    match: utils.makeCheckFn(expected),
    respond,
  });
  return this;
}

export async function _onPrompt() {
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
}
