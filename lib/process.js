import execa from 'execa';
import stripAnsi from 'strip-ansi';
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
    this.proc.exitCode = 0;
    this.proc.cancel(signal, options);
    await this.proc;
  });
}

/**
 * fork cli
 *
 * @param {String} cmd - cmd string
 * @param {Array} [args] - cmd args
 * @param {execa.NodeOptions} [opts] - cmd options
 * @return {Runner} runner instance
 */
export function fork(cmd, args, opts) {
  return this._registerCommand('fork', cmd, args, opts);
}

/* spawn shell
  *
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

  this.proc.stdout.on('data', data => {
    const content = stripAnsi(data.toString());
    this.ctx.result.stdout += content;
    this.emit('stdout', content);
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

export function stdin(expected, respond) {
  this._promptList.push({
    match: utils.makeCheckFn(expected),
    respond,
  });
  return this;
}

export function _onPrompt() {
  for (const [ index, item ] of this._promptList.entries()) {
    const { match, respond } = item;
    if (match(this.ctx.result.stdout)) {
      // FIXME: when stdin.write, stdout will recieve duplicative output
      this.proc.stdin.write(respond);
      this._promptList.splice(index, 1);
      if (this._promptList.length === 0) this.proc.stdin.end();
      break;
    }
  }
}
