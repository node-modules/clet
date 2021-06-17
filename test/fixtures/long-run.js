#!/usr/bin/env node

console.log('this is long run process');

async function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function run() {
  console.log('send message to parent');
  process.send && process.send({ action: 'egg-ready' });
  for (let i = 0; i < 10; i++) {
    await sleep(100);
    console.log(i);
  }
  console.log('stopping...');
}

run().catch(console.error);
