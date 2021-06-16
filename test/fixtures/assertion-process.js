#!/usr/bin/env node

console.log('version: %s', process.version);
console.log('argv: %j', process.argv);

if (process.argv[2] === '--error') {
  console.error('this is an error');
}

if (process.argv[2] === '--fail') {
  throw new Error('this is an error');
}
