#!/usr/bin/env node

console.log('this is example bin~');
console.log('cwd: %s', process.cwd());
console.log('argv: %j', process.argv.slice(2));
console.log('execArgv: %j', process.execArgv);
console.warn('this is a warning');
