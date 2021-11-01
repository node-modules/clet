import execa from 'execa';
import dotProp from 'dot-prop';
import path from 'path';
import stripFinalNewline from 'strip-final-newline';
import * as utils from './utils.js';
import { assert } from './assert.js';
import type { Runner, TestRunnerChainFunction } from './runner.js';

export class OperationPlugin {
  /**
   * tap a method to chain sequence.
   *
   * @param {Function} fn - function
   * @return {Runner} instance for chain
   */
  tap(fn: TestRunnerChainFunction) {
    return (this as unknown as Runner).addChain(fn);
  }

  /**
   * print log for debugging, support formattor and dot path
   *
   * @param {string} format - format
   * @param  {...string} [keys] - contents
   * @return {Runner} instance for chain
   */
  log(format, ...keys) {
    (this as unknown as Runner).addChain(async function log(ctx) {
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
   * @return {Runner} instance for chain
   */
  sleep(ms: number) {
    assert(ms, '`ms` is required');
    return this.tap(function sleep() {
      return utils.sleep(ms);
    });
  }

  /**
   * mkdir -p
   *
   * @param {string} dir - dir path, support relative path to `cwd`
   * @return {Runner} instance for chain
   */
  mkdir(dir: string) {
    assert(dir, '`dir` is required');
    return this.tap(async function mkdir(ctx) {
      await utils.mkdir(path.resolve(ctx.cmdOpts.cwd, dir));
    });
  }

  /**
   * move dir to trash
   *
   * @param {string} dir - dir path, support relative path to `cwd`
   * @return {Runner} instance for chain
   */
  rm(dir) {
    assert(dir, '`dir is required');
    return this.tap(async function rm(ctx) {
      await utils.rm(path.resolve(ctx.cmdOpts.cwd, dir));
    });
  }

  /**
   * write file, will auto create parent dir
   *
   * @param {string} filePath - file path, support relative path to `cwd`
   * @param {String|Object} content - content to write, if pass object, will `JSON.stringify`
   * @return {Runner} instance for chain
   */
  writeFile(filePath: string, content: string | object) {
    assert(filePath, '`filePath` is required');
    return this.tap(async function writeFile(ctx) {
      filePath = path.resolve(ctx.cmdOpts.cwd, filePath);
      return await utils.writeFile(filePath, content);
    });
  }

  /**
   * run a shell
   *
   * @param {string} cmd - cmd string
   * @param {Array} [args] - cmd args
   * @param {execa.NodeOptions} [opts] - cmd options
   * @return {Runner} instance for chain
   */
  shell(cmd: string, args: any[] = [], opts: execa.Options = {}) {
    assert(cmd, '`cmd` is required');

    // exec(cmd, opts)
    if (args && !Array.isArray(args)) {
      opts = args;
      args = [];
    }
    return this.tap(async function shell(ctx) {
      const command = [ cmd, ...args ].join(' ');
      (opts as any).cwd = opts.cwd || ctx.cmdOpts.cwd;

      const proc = execa.command(command, opts);
      const logger = ctx.logger.child('Shell', { showTag: false });

      proc.stdout!.on('data', data => {
        logger.info(stripFinalNewline(data.toString()));
      });

      proc.stderr!.on('data', data => {
        logger.info(stripFinalNewline(data.toString()));
      });

      await proc;
    });
  }

}
