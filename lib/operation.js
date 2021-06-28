import execa from 'execa';
import dotProp from 'dot-prop';
import path from 'path';
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

export function mkdir(targetPath) {
  assert(targetPath, '`targetPath` is required');
  return this.tap(async function mkdir(ctx) {
    await utils.mkdir(path.resolve(ctx.cmdOpts.cwd, targetPath));
  });
}

export function rm(targetPath) {
  assert(targetPath, '`targetPath is required');
  return this.tap(async function rm() {
    await utils.rm(targetPath);
  });
}

export function writeFile(filePath, content) {
  assert(filePath, '`filePath` is required');
  return this.tap(async function writeFile(ctx) {
    if (utils.types.isFunction(content)) {
      content = content(filePath, ctx);
    }
    return await utils.writeFile(filePath, content);
  });
}

export function shell(cmd, args = [], opts = {}) {
  assert(cmd, '`cmd` is required');

  // exec(cmd, opts)
  if (args && !Array.isArray(args)) {
    opts = args;
    args = [];
  }
  opts.cwd = opts.cwd || this.ctx.cmdOpts.cwd;

  return this.tap(async function shell() {
    const command = [ cmd, ...args ].join(' ');
    const proc = execa.command(command, opts);
    proc.stdout.on('data', data => {
      this.logger.info(data.toString());
    });

    proc.stderr.on('data', data => {
      this.logger.info(data.toString());
    });

    await proc;
  });
}
