#!/usr/bin/env node

const cli = '\x1b[37;1m' + 'CLI' + '\x1b[0m';
const hub = '\x1b[43;1m' + 'Hub' + '\x1b[0m';
const msg = '\x1b[37;1m' + 'MSG' + '\x1b[0m';

console.log(cli + hub);
console.warn(msg + hub);
