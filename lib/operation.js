import * as utils from './utils';
import assert from './assert-extend.js';
import execa from 'execa';
import path from 'path';

export function tap(fn) {
  return this._addChain(fn);
}

export function sleep(ms) {
  assert(ms, '`ms` is required');
  return this.tap(() => utils.sleep(ms));
}

export function mkdir(targetPath) {
  assert(targetPath, '`targetPath` is required');
  return this.tap(async ctx => {
    await utils.mkdir(path.resolve(ctx.cwd, targetPath));
  });
}

export function rm(targetPath) {
  assert(targetPath, '`targetPath is required');
  return this.tap(async () => {
    await utils.del(targetPath);
  });
}

export function writeFile(filePath, content) {
  assert(filePath, '`filePath` is required');
  return this.tap(async ctx => {
    if (utils.is.function(content)) {
      content = content(filePath, ctx);
    }
    return await utils.writeFile(filePath, content);
  });
}

export function exec(cmd, args, opts) {
  assert(cmd, '`cmd` is required');

  // exec(cmd, opts)
  if (args && !utils.is.array(args)) {
    opts = args;
    args = undefined;
  }
  opts.cwd = opts.cwd || this.cmdOpts.cwd;

  const command = utils.filterAndJoin([ cmd, ...args ]);

  return this.tap(async () => {
    const proc = execa.command(command, opts);
    // proc.stdout.pipe(process.stdout);
    // proc.stderr.pipe(process.stderr);
    await proc;
  });
}
