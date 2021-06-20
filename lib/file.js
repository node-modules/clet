import assert from './assert.js';
import path from 'path';
import * as utils from './utils';

export function mkdir(targetPath) {
  assert(targetPath, '`targetPath` is required');
  return this.tap(async ctx => {
    await utils.mkdir(path.resolve(ctx.cmdOpts.cwd, targetPath));
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
