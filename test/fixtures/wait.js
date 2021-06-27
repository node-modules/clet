#!/usr/bin/env node

import { sleep } from '../test-utils.js';

async function run() {
  console.log('starting...');
  await sleep(500);
  console.log('started');
  console.error('be careful');
  process.send && process.send({ action: 'egg-ready' });
  process.send && process.send('egg-ready');
  await sleep(500);
  process.exit(0);
}

run().catch(console.error);
