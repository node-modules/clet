
import fs from 'fs/promises';
import path from 'path';
import { dirname } from 'dirname-filename-esm';
import isMatch from 'lodash.ismatch';
import is from 'is-type-of';
import del from 'del';

export { del };

export { is };

export { isMatch };

export async function mkdir(p, opts) {
  const { recursive = true } = opts || {};
  return await fs.mkdir(p, { recursive });
}

export async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_) {
    return false;
  }
}


export function resolve(meta, ...args) {
  const p = is.object(meta) ? dirname(meta) : meta;
  return path.resolve(p, ...args);
}

export function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export function filterAndJoin(arr, separator = ' ') {
  return arr.filter(x => x).join(separator);
}

export function makeCheckFn(expected) {
  if (is.regexp(expected)) {
    return input => expected.test(input);
  } else if (is.string(expected)) {
    return input => input && input.includes(expected);
  }
  return input => isMatch(input, expected);
}
