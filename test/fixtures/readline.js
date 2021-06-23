#!/usr/bin/env node

import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(q) {
  return new Promise(resolve => rl.question(q, resolve));
}

async function run() {
  const name = await ask('Name: ');
  const email = await ask('Email: ');
  rl.close();
  console.log(`Author: ${name} <${email}>`);
}

run().catch(console.error);
