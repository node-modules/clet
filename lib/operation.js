import execa from 'execa';
import dotProp from 'dot-prop';

import * as utils from './utils';
import assert from './assert.js';

export function tap(fn) {
  return this._addChain(fn);
}

export function log(format, ...keys) {
  this._addChain(ctx => {
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
  return this.tap(() => utils.sleep(ms));
}

export function shell(cmd, args, opts) {
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
