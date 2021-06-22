#!/usr/bin/env node

import enquirer from 'enquirer';

async function run() {
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
