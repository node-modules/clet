#!/usr/bin/env node

console.log('version: %s', process.version);
console.log('argv: %j', process.argv.slice(2));

const type = process.argv[2] && process.argv[2].substring(2);

switch (type) {
  case 'error':
    console.error('this is an error');
    break;

  case 'fail':
    throw new Error('this is an error');

  case 'delay':
    console.log('delay for a while');
    setTimeout(() => console.log('delay done'), 200);
    break;

  default:
    break;
}
