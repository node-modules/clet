import assert from '../assert-extend.js';
import fs from 'fs/promises';
import path from 'path';
import { exists } from '../utils';

function wrapError(fn, filePath) {
  try {
    fn();
  } catch (err) {
    err.message = `file(${filePath}) with content: ${err.message}`;
    throw err;
  }
}

export function file(filePath, expected) {
  assert(filePath, '`filePath` is required');

  return this.expect(async ({ cwd, assert }) => {
    const fullPath = path.resolve(cwd, filePath);

    // check whether file exists
    const isExists = await exists(fullPath);
    assert(isExists, `Expected ${fullPath} to be exists`);

    // compare content, support string/json/regex
    if (expected) {
      const content = await fs.readFile(fullPath, 'utf-8');
      wrapError(() => assert.matchRule(content, expected), fullPath);
    }
  });
}

export function notFile(filePath, expected) {
  assert(filePath, '`filePath` is required');

  return this.expect(async ({ cwd, assert }) => {
    const fullPath = path.resolve(cwd, filePath);

    // check whether file exists
    const isExists = await exists(fullPath);
    if (!expected) {
      assert(!isExists, `Expected ${fullPath} to not be exists`);
    } else {
      assert(isExists, `Expected ${fullPath} to be exists`);
      const content = await fs.readFile(fullPath, 'utf-8');
      wrapError(() => assert.doesNotMatchRule(content, expected), fullPath);
    }
  });
}
