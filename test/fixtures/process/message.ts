#!/usr/bin/env node

console.log('starting...');

setTimeout(() => {
  if (process.send) {
    process.send('ready');
  }
}, 500);
