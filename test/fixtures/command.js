#!/usr/bin/env node

console.log('version=%s', process.version);
console.log('argv=%j', process.argv.slice(2));
console.log('execArgv=%j', process.execArgv);

if (process.env.logEnv) {
  const keys = process.env.logEnv.split(',');
  for (const key of keys) {
    console.log(`env.${key}=${process.env[key]}`);
  }
}
