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
  }, {
    type: 'select',
    name: 'gender',
    message: 'Gender:',
    choices: [ 'boy', 'girl', 'unknown' ],
  }]);
  console.log(`Author: ${answers.name} <${answers.email}>`);
  console.log(`Gender: ${answers.gender}`);
}

run().catch(console.error);
