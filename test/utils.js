
import fs from 'fs';
import path from 'path';
import del from 'del';
import { dirname } from 'dirname-filename-esm';

export { del };
export { default as assertFile } from 'assert-file';

export async function mkdir(p, opts) {
  const { recursive = true, clean = true } = opts || {};
  if (clean) await del(p);
  return await fs.promises.mkdir(p, { recursive });
}

export function resolve(meta, ...args) {
  return path.resolve(dirname(meta), ...args);
}
