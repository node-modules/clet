
import trash from 'trash';
import fs from 'fs/promises';
import assert from 'assert';
import { URL } from 'url';

describe('test/trash.test.js', () => {
  it('should work', async () => {
    const file = new URL('abc.txt', import.meta.url);
    await fs.writeFile(file, 'foo');
    await fs.access(file);
    console.log(file.href);
    await trash([ '**/abc.txt' ]);
    await assert.rejects(fs.access(file));
  });
});
