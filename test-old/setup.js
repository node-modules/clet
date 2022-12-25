import { promises as fs } from 'fs';
import path from 'path';

export async function setup() {
  const p = path.join(process.cwd(), 'test/.tmp');
  await fs.rm(p, { force: true, recursive: true });
}

export async function teardown() {
  const p = path.join(process.cwd(), 'test/.tmp');
  await fs.rm(p, { force: true, recursive: true });
}
