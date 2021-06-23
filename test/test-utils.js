import path from 'path';
import * as utils from '../lib/utils.js';

export * from '../lib/utils.js';
export { default as assertFile } from 'assert-file';
export { strict as assert } from 'assert';

// calc tmp dir by jest test file name
export function getTempDir(expect) {
  const { testPath } = expect.getState();
  let p = testPath;
  do {
    p = path.dirname(testPath);
  } while (path.basename(p) !== 'test');

  return path.resolve(p, '.tmp', path.basename(testPath, '.test.js'));
}

export async function initDir(p) {
  await utils.rm(p);
  await utils.mkdir(p);
}

export const timePlugin = {
  time(label = 'default') {
    return this.tap(() => {
      this.ctx.timeMapping = this.ctx.timeMapping || {};
      this.ctx.timeMapping[label] = Date.now();
    });
  },
  timeEnd(label, fn) {
    if (utils.types.isFunction(label)) {
      fn = label;
      label = 'default';
    }
    return this.tap(() => {
      const start = this.ctx.timeMapping[label];
      const now = Date.now();
      const cost = now - start;
      fn(cost, start, now);
    });
  },
};
