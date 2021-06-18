#!/usr/bin/env node

import { sleep } from '../utils.js';
import fs from 'fs/promises';

console.log('this is long run process');

const filePath = process.env.filePath;

console.log(`log to ${filePath}`);

async function log(msg) {
  console.log(msg);
  await fs.appendFile(filePath, msg);
}

async function run() {

  log('starting egg....');
  log('loading egg plugin');
  log('loading egg controller');

  await sleep(1000);

  // write file
  // event
  process.send && process.send({ action: 'egg-ready' });
  process.send && process.send('egg-ready');
  log('egg started at localhost:8080');

  await sleep(200);
  process.send && process.send('some message');

  for (let i = 0; i < 10; i++) {
    await sleep(100);
    console.log(i);
  }
  console.log('stopping...');
}

run().catch(console.error);
