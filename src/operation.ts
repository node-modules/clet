import execa from 'execa';
import dotProp from 'dot-prop';
import path from 'path';
import stripFinalNewline from 'strip-final-newline';
import * as utils from './utils.js';
import { assert } from './assert.js';
import type { TestRunner, TestRunnerChainFunction } from './runner';

/**
 * tap a method to chain sequence.
 *
 * @param {Function} fn - function
 * @return {TestRunner} instance for chain
 */
export function tap(this: TestRunner, fn: TestRunnerChainFunction) {
  return this.addChain(fn);
}

/**
 * print log for debugging, support formattor and dot path
 *
 * @param {String} format - format
 * @param  {...string} [keys] - contens
 * @return {TestRunner} instance for chain
 */
export function log(this: TestRunner, format, ...keys) {
  this.addChain(async function log(ctx) {
    if (keys.length === 0) {
      this.logger.info(dotProp.get(ctx, format) || format);
    } else {
      this.logger.info(format, ...keys.map(k => dotProp.get(ctx, k)));
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
export function sleep(this: TestRunner, ms: number) {
  assert(ms, '`ms` is required');
  return Reflect.apply(tap, this, [
    function sleep() {
      return utils.sleep(ms);
    },
  ]);
}

/**
 * mkdir -p
 *
 * @param {String} dir - dir path, support relative path to `cwd`
 * @return {TestRunner} instance for chain
 */
export function mkdir(this: TestRunner, dir: string) {
  assert(dir, '`dir` is required');
  return Reflect.apply(tap, this, [
    async function mkdir(ctx) {
      await utils.mkdir(path.resolve(ctx.cmdOpts.cwd, dir));
    },
  ]);
}

/**
 * move dir to trash
 *
 * @param {String} dir - dir path, support relative path to `cwd`
 * @return {TestRunner} instance for chain
 */
export function rm(this: TestRunner, dir) {
  assert(dir, '`dir is required');
  return Reflect.apply(tap, this, [
    async function rm(ctx) {
      await utils.rm(path.resolve(ctx.cmdOpts.cwd, dir));
    },
  ]);
}

/**
 * write file, will auto create parent dir
 *
 * @param {String} filePath - file path, support relative path to `cwd`
 * @param {String|Object} content - content to write, if pass object, will `JSON.stringify`
 * @return {TestRunner} instance for chain
 */
export function writeFile(this: TestRunner, filePath: string, content: string | object) {
  assert(filePath, '`filePath` is required');
  return Reflect.apply(tap, this, [
    async function writeFile(ctx) {
      filePath = path.resolve(ctx.cmdOpts.cwd, filePath);
      return await utils.writeFile(filePath, content);
    },
  ]);
}

/**
 * run a shell
 *
 * @param {String} cmd - cmd string
 * @param {Array} [args] - cmd args
 * @param {execa.NodeOptions} [opts] - cmd options
 * @return {TestRunner} instance for chain
 */
export function shell(this: TestRunner, cmd: string, args: any[] = [], opts: {
  cwd?: string;
} = {}) {
  assert(cmd, '`cmd` is required');

  // exec(cmd, opts)
  if (args && !Array.isArray(args)) {
    opts = args;
    args = [];
  }

  return Reflect.apply(tap, this, [
    async function shell(ctx) {
      const command = [ cmd, ...args ].join(' ');
      opts.cwd = opts.cwd || ctx.cmdOpts.cwd;

      const proc = execa.command(command, opts);
      const logger = ctx.logger.child('Shell', { showTag: false });

      proc.stdout!.on('data', data => {
        logger.info(stripFinalNewline(data.toString()));
      });

      proc.stderr!.on('data', data => {
        logger.info(stripFinalNewline(data.toString()));
      });

      await proc;
    },
  ]);
}
