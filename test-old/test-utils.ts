import path from 'path';
import crypto from 'crypto';
import { promises as fs } from 'fs';
export { strict as assert } from 'assert';

// export * from '../lib/utils.js';

// calc tmp dir by jest test file name
export function getTempDir(...p) {
  return path.join(process.cwd(), 'test/.tmp', crypto.randomUUID(), ...p);
}

export async function initDir(p) {
  await fs.rm(p, { force: true, recursive: true });
  await fs.mkdir(p, { recursive: true });
}
