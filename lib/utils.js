
import { promises as fs } from 'fs';
import { types } from 'util';
import path from 'path';

import { dirname } from 'dirname-filename-esm';
import isMatch from 'lodash.ismatch';
import trash from 'trash';

types.isString = function(v) { return typeof v === 'string'; };
types.isObject = function(v) { return v !== null && typeof v === 'object'; };
types.isFunction = function(v) { return typeof v === 'function'; };

export { types, isMatch };

export function validate(input, expected) {
  if (Array.isArray(expected)) {
    return expected.some(rule => validate(input, rule));
  } else if (types.isRegExp(expected)) {
    return expected.test(input);
  } else if (types.isString(expected)) {
    return input && input.includes(expected);
  } else if (types.isObject(expected)) {
    return isMatch(input, expected);
  }
  return expected(input);
}

export async function mkdir(p, opts) {
  return await fs.mkdir(p, { recursive: true, ...opts });
}

export async function rm(p, opts) {
  return await trash(p, opts);
  // return await fs.rm(p, { force: true, recursive: true, ...opts });
}

/**
 * Check whether is parent
 *
 * @param {String} parent - parent file path
 * @param {String} child - child file path
 * @return {Boolean} true if parent >= child
 */
export function isParent(parent, child) {
  const p = path.relative(parent, child);
  return !(p === '' || p.startsWith('..'));
}

export async function writeFile(filePath, content, opts) {
  await mkdir(path.dirname(filePath));
  if (types.isObject(content)) {
    content = JSON.stringify(content, null, 2);
  }
  return await fs.writeFile(filePath, content, opts);
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
  const p = types.isObject(meta) ? dirname(meta) : meta;
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
