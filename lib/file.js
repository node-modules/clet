import path from 'path';
import * as utils from './utils.js';

const { assert } = utils;

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
