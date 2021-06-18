#!/usr/bin/env node

import enquirer from 'enquirer';
// import { sleep } from '../utils';

async function run() {
  // await sleep(1000);
  const answers = await enquirer.prompt([{
    type: 'input',
    name: 'name',
    message: 'Name:',
  }, {
    type: 'input',
    name: 'email',
    message: 'Email:',
  }]);
  console.log(`Author: ${answers.name} <${answers.email}>`);
}

run().catch(console.error);
