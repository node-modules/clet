#!/usr/bin/env node

import fs from 'fs';

fs.writeFileSync('./test.md', '# test\nthis is a README');

fs.writeFileSync('./test.json', JSON.stringify({
  name: 'test',
  version: '1.0.0',
  config: {
    port: 8080,
  },
}, null, 2));

console.log(fs.readdirSync('./'));
