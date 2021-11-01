
import { promises as fs, MakeDirectoryOptions, RmOptions } from 'fs';
import { types as nativeTypes } from 'util';
import path from 'path';

import { dirname } from 'dirname-filename-esm';
import isMatch from 'lodash.ismatch';
import trash from 'trash';

const types = {
  ...nativeTypes,
  isString(v: any): v is string {
    return typeof v === 'string';
  },
  isObject(v: any): v is object {
    return v !== null && typeof v === 'object';
  },
  // eslint-disable-next-line @typescript-eslint/ban-types
  isFunction(v: any): v is Function {
    return typeof v === 'function';
  },
  isClass(fn: any): boolean {
    const toString = Function.prototype.toString;

    function fnBody(fn) {
      return toString.call(fn).replace(/^[^{]*{\s*/, '').replace(/\s*}[^}]*$/, '');
    }

    return (typeof fn === 'function' &&
      (/^class(?:\s|{)/.test(toString.call(fn)) ||
        (/^.*classCallCheck\(/.test(fnBody(fn)))) // babel.js
    );
  },
};

export { types, isMatch };

export type ValidateExpected = string | RegExp | ((input: string | object) => boolean) | Array<ValidateExpected> | object;

/**
 * validate input with expected rules
 *
 * @param {String|Object} input - target
 * @param {String|RegExp|Object|Function|Array} expected - rules
 * @return {Boolean} pass or not
 */
export function validate(input: string | object, expected: ValidateExpected): boolean {
  if (Array.isArray(expected)) {
    return expected.some(rule => validate(input, rule));
  } else if (types.isRegExp(expected)) {
    return expected.test(input as string);
  } else if (types.isString(expected)) {
    return !!(input && (input as string).includes(expected));
  } else if (types.isFunction(expected)) {
    return expected(input);
  }
  return isMatch(input, expected);
}

/**
 * Check whether is parent
 *
 * @param {string} parent - parent file path
 * @param {string} child - child file path
 * @return {Boolean} true if parent >= child
 */
export function isParent(parent: string, child: string): boolean {
  const p = path.relative(parent, child);
  return !(p === '' || p.startsWith('..'));
}

/**
 * mkdirp -p
 *
 * @param {string} dir - dir path
 * @param {Object} [opts] - see fsPromises.mkdirp
 */
export async function mkdir(dir: string, opts?: MakeDirectoryOptions) {
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
export async function rm(p: string | readonly string[], opts: RmOptions & trash.Options & {
  trash?: boolean;
} = {}): Promise<void> {
  /* istanbul ignore if */
  if (opts.trash === false) {
    if (typeof p === 'string') {
      p = [ p ];
    }
    const tasks = p.map(f => fs.rm(f, { force: true, recursive: true, ...opts }));
    await Promise.all(tasks);
  }
  await trash(p, opts);
}


/**
 * write file, will auto create parent dir
 *
 * @param {string} filePath - file path
 * @param {String|Object} content - content to write, if pass object, will `JSON.stringify`
 * @param {Object} [opts] - see fsPromises.writeFile
 */
export async function writeFile(filePath: string, content: string | object, opts?: {
  encoding?: BufferEncoding;
  mode?: number;
  flag?: string;
  signal?: AbortSignal;
}): Promise<void> {
  await mkdir(path.dirname(filePath));
  if (types.isObject(content)) {
    content = JSON.stringify(content, null, 2);
  }
  return await fs.writeFile(filePath, content, opts);
}

/**
 * check exists due to `fs.exists` is deprecated
 *
 * @param {string} filePath - file or directory
 * @return {Boolean} exists or not
 */
export async function exists(filePath: string): Promise<boolean> {
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
 * @return {string} file path
 */
export function resolve(meta: ImportMeta, ...args: string[]): string {
  const p = types.isObject(meta) ? dirname(meta) : meta;
  return path.resolve(p, ...args);
}

/**
 * take a sleep
 *
 * @param {Number} ms - millisecond
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
