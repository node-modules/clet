import { promises as fs } from 'fs';
import path from 'path';

export default async () => {
  const tmpDir = path.join(process.cwd(), '.tmp');
  await fs.rm(tmpDir, { force: true, recursive: true });
};
