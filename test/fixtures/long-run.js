#!/usr/bin/env node

import * as utils from '../utils.js';

async function run() {
  console.log('this is long run process');
  const filePath = process.env.filePath;
  console.log('starting egg....');

  await utils.sleep(2000);
  console.log(`log to ${filePath}`);
  await utils.writeFile(filePath, 'this is a log');

  process.send && process.send({ action: 'egg-ready' });
  // process.send && process.send('egg-ready');
  // console.log('egg started at localhost:8080');

  console.log('stopping...');
  await utils.del(filePath);
}

run().catch(console.error);
