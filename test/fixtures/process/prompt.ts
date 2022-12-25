import * as readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });

rl.on('pause', () => {
  console.log('Readline paused.');
});

rl.on('resume', () => {
  console.log('Readline resumed.');
});

rl.question('What is your favorite food? ', (answer) => {
  console.log(`Oh, so your favorite food is ${answer}`);
  let i = 0;

  rl.close();
  // const id = setInterval(() => {
  //   i++;
  //   console.log(`#${i}.`, new Date());
  // }, 1000);

  // setTimeout(() => {
  //   console.error('some error');
  //   console.log('end');
  //   clearInterval(id);
  // }, 1000 * 10);
});
