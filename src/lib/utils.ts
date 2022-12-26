import fs from 'node:fs/promises';
import util from 'node:util';
import path from 'node:path';

import { dirname } from 'dirname-filename-esm';
import isMatch from 'lodash.ismatch';
import trash from 'trash';

const types = {
  ...util.types,
  isString(v: any): v is string {
    return typeof v === 'string';
  },
  isObject(v: any): v is object {
    return v !== null && typeof v === 'object';
  },
  isFunction(v: any): v is (...args: any[]) => any {
    return typeof v === 'function';
  },
};

export { types, isMatch };

/**
 * validate input with expected rules
 *
 * @param {string|object} input - target
 * @param {string|regexp|object|function|array} expected - rules
 * @return {boolean} pass or not
 */
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

/**
 * Check whether is parent
 *
 * @param {string} parent - parent file path
 * @param {string} child - child file path
 * @return {boolean} true if parent >= child
 */
export function isParent(parent: string, child: string): boolean {
  const p = path.relative(parent, child);
  return !(p === '' || p.startsWith('..'));
}

/**
 * mkdirp -p
 *
 * @param {string} dir - dir path
 * @param {object} [opts] - see fsPromises.mkdirp
 */
export async function mkdir(dir: string, opts?: any) {
  return await fs.mkdir(dir, { recursive: true, ...opts });
}

/**
 * removes files and directories.
 *
 * by default it will only moves them to the trash, which is much safer and reversible.
 *
 * @param {string|string[]} p - accepts paths and [glob patterns](https://github.com/sindresorhus/globby#globbing-patterns)
 * @param {object} [opts] - options of [trash](https://github.com/sindresorhus/trash) or [fsPromises.rm](https://nodejs.org/api/fs.html#fs_fspromises_rm_path_options)
 * @param {boolean} [opts.trash=true] - whether to move to [trash](https://github.com/sindresorhus/trash) or permanently delete
 */
export async function rm(p, opts = {}) {
  /* istanbul ignore if */
  if (opts.trash === false || process.env.CI) {
    return await fs.rm(p, { force: true, recursive: true, ...opts });
  }
  /* istanbul ignore next */
  return await trash(p, opts);
}


/**
 * write file, will auto create parent dir
 *
 * @param {string} filePath - file path
 * @param {string|object} content - content to write, if pass object, will `JSON.stringify`
 * @param {object} [opts] - see fsPromises.writeFile
 */
export async function writeFile(filePath: string, content: string | Record<string, any>, opts?: any) {
  await mkdir(path.dirname(filePath));
  if (types.isObject(content)) {
    content = JSON.stringify(content, null, 2);
  }
  return await fs.writeFile(filePath, content, opts);
}

/**
 * check exists due to `fs.exists` is deprecated
 */
export async function exists(filePath: string) {
  return await fs.access(filePath).then(() => true).catch(() => false);
}

/**
 * resolve file path by import.meta, kind of __dirname for esm
 *
 * @param {Object} meta - import.meta
 * @param  {...String} args - other paths
 * @return {String} file path
 */
export function resolve(meta, ...args) {
  const p = types.isObject(meta) ? dirname(meta) : meta;
  return path.resolve(p, ...args);
}

/**
 * take a sleep
 *
 * @param {number} ms - millisecond
 */
export async function sleep(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
