import * as execa from 'execa';
import * as dotProp from 'dot-prop';
import path from 'path';
import stripFinalNewline from 'strip-final-newline';
import stripAnsi from 'strip-ansi';
import * as utils from './utils.js';
import { assert } from './assert.js';

/**
 * tap a method to chain sequence.
 *
 * @param {Function} fn - function
 * @return {TestRunner} instance for chain
 */
export function tap(fn) {
  return this._addChain(fn);
}

/**
 * print log for debugging, support formattor and dot path
 *
 * @param {String} format - format
 * @param  {...string} [keys] - contens
 * @return {TestRunner} instance for chain
 */
export function log(format, ...keys) {
  this._addChain(function log(ctx) {
    if (keys.length === 0) {
      this.logger.info(dotProp.getProperty(ctx, format) || format);
    } else {
      this.logger.info(format, ...keys.map(k => dotProp.getProperty(ctx, k)));
    }
  });
  return this;
}

/**
 * take a sleep
 *
 * @param {Number} ms - millisecond
 * @return {TestRunner} instance for chain
 */
export function sleep(ms) {
  assert(ms, '`ms` is required');
  return this.tap(function sleep() {
    return utils.sleep(ms);
  });
}

/**
 * mkdir -p
 *
 * @param {String} dir - dir path, support relative path to `cwd`
 * @return {TestRunner} instance for chain
 */
export function mkdir(dir) {
  assert(dir, '`dir` is required');
  return this.tap(async function mkdir(ctx) {
    await utils.mkdir(path.resolve(ctx.cmdOpts.cwd, dir));
  });
}

/**
 * move dir to trash
 *
 * @param {String} dir - dir path, support relative path to `cwd`
 * @return {TestRunner} instance for chain
 */
export function rm(dir) {
  assert(dir, '`dir is required');
  return this.tap(async function rm(ctx) {
    await utils.rm(path.resolve(ctx.cmdOpts.cwd, dir));
  });
}

/**
 * write file, will auto create parent dir
 *
 * @param {String} filePath - file path, support relative path to `cwd`
 * @param {String|Object} content - content to write, if pass object, will `JSON.stringify`
 * @return {TestRunner} instance for chain
 */
export function writeFile(filePath, content) {
  assert(filePath, '`filePath` is required');
  return this.tap(async function writeFile(ctx) {
    filePath = path.resolve(ctx.cmdOpts.cwd, filePath);
    return await utils.writeFile(filePath, content);
  });
}

/**
 * run a shell
 *
 * @param {String} cmd - cmd string
 * @param {Array} [args] - cmd args
 * @param {execa.NodeOptions | { collectLog: boolean; }} [opts] - cmd options
 * @return {TestRunner} instance for chain
 */
export function shell(cmd, args = [], opts = {}) {
  assert(cmd, '`cmd` is required');

  // exec(cmd, opts)
  if (args && !Array.isArray(args)) {
    opts = args;
    args = [];
  }

  return this.tap(async function shell(ctx) {
    const command = [ cmd, ...args ].join(' ');
    opts.cwd = opts.cwd || ctx.cmdOpts.cwd;

    const proc = execa.execaCommand(command, opts);
    const logger = ctx.logger.child('Shell', { showTag: false });

    proc.stdout.on('data', data => {
      const origin = stripFinalNewline(data.toString());
      if (opts.collectLog !== false) {
        const content = stripAnsi(origin);
        ctx.result.stdout += content;
      }
      logger.info(origin);
    });

    proc.stderr.on('data', data => {
      const origin = stripFinalNewline(data.toString());
      if (opts.collectLog !== false) {
        const content = stripAnsi(origin);
        ctx.result.stderr += content;
      }
      logger.info(origin);
    });

    await proc;
  });
}
