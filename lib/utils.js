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

/**
 * validate input with expected rules
 *
 * @param {String|Object} input - target
 * @param {String|RegExp|Object|Function|Array} expected - rules
 * @return {Boolean} pass or not
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
 * @param {String} parent - parent file path
 * @param {String} child - child file path
 * @return {Boolean} true if parent >= child
 */
export function isParent(parent, child) {
  const p = path.relative(parent, child);
  return !(p === '' || p.startsWith('..'));
}

/**
 * mkdirp -p
 *
 * @param {String} dir - dir path
 * @param {Object} [opts] - see fsPromises.mkdirp
 */
export async function mkdir(dir, opts) {
  return await fs.mkdir(dir, { recursive: true, ...opts });
}

/**
 * removes files and directories.
 *
 * by default it will only moves them to the trash, which is much safer and reversible.
 *
 * @param {String|Array} p - accepts paths and [glob patterns](https://github.com/sindresorhus/globby#globbing-patterns)
 * @param {Object} [opts] - options of [trash](https://github.com/sindresorhus/trash) or [fsPromises.rm](https://nodejs.org/api/fs.html#fs_fspromises_rm_path_options)
 * @param {Boolean} [opts.trash=true] - whether to move to [trash](https://github.com/sindresorhus/trash) or permanently delete
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
 * @param {String} filePath - file path
 * @param {String|Object} content - content to write, if pass object, will `JSON.stringify`
 * @param {Object} [opts] - see fsPromises.writeFile
 */
export async function writeFile(filePath, content, opts) {
  await mkdir(path.dirname(filePath));
  if (types.isObject(content)) {
    content = JSON.stringify(content, null, 2);
  }
  return await fs.writeFile(filePath, content, opts);
}

/**
 * check exists due to `fs.exists` is deprecated
 *
 * @param {String} filePath - file or directory
 * @return {Boolean} exists or not
 */
export async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (_) {
    return false;
  }
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
 * @param {Number} ms - millisecond
 */
export function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
