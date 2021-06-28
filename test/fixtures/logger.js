#!/usr/bin/env node

console.log('this is a log message');
console.log('version=%s', process.version);
console.error(new Error('some error message'));
console.log('process exit');
