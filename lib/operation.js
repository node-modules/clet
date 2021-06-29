import execa from 'execa';
import dotProp from 'dot-prop';
import path from 'path';
import stripFinalNewline from 'strip-final-newline';
import * as utils from './utils.js';
import { assert } from './assert.js';

export function tap(fn) {
  return this._addChain(fn);
}

export function log(format, ...keys) {
  this._addChain(function log(ctx) {
    if (keys.length === 0) {
      this.logger.info(dotProp.get(ctx, format) || format);
    } else {
      this.logger.info(format, keys.map(k => dotProp.get(ctx, k)));
    }
  });
  return this;
}

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

export function writeFile(filePath, content) {
  assert(filePath, '`filePath` is required');
  return this.tap(async function writeFile(ctx) {
    filePath = path.resolve(ctx.cmdOpts.cwd, filePath);
    if (utils.types.isFunction(content)) {
      content = content(filePath, ctx);
    }
    return await utils.writeFile(filePath, content);
  });
}

/**
 * run a shell
 *
 * @param {String} cmd - cmd string
 * @param {Array} [args] - cmd args
 * @param {execa.NodeOptions} [opts] - cmd options
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

    const proc = execa.command(command, opts);

    proc.stdout.on('data', data => {
      ctx.logger.info(stripFinalNewline(data.toString()));
    });

    proc.stderr.on('data', data => {
      ctx.logger.info(stripFinalNewline(data.toString()));
    });

    await proc;
  });
}
