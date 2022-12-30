#!/usr/bin/env node

console.log('long run...');

process.on('SIGTERM', () => {
  console.log('recieve SIGTERM');
  process.exit(0);
});

setTimeout(() => {
  console.log('exit long-run');
}, 5000);

