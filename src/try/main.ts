// import execa from 'execa';

// async function run() {
//   console.log(execa);
//   const proc = execa.node('src/try/child.ts', ['--foo', 'bar'], {
//     cwd: process.cwd(),
//     nodeOptions: ['--inspect-brk'],
//   });
//   proc.stdout.on('data', (data) => {
//     console.log('stdout', data.toString());
//   });
//   proc.stderr.on('data', (data) => {
//     console.log('stderr', data.toString());
//   });
//   const result = await proc;
//   console.log('end', result);
// }

// run().catch(console.error);

import { Process } from '../process';

async function run() {
  const proc = new Process('fork', 'src/try/child.ts', ['--foo', 'bar'], {
    cwd: process.cwd(),
    // nodeOptions: ['--inspect-brk'],
  });

  const x = proc.exec();
  const y = await proc.wait('stdout', /What is your/);
  proc.write('sss');
  const z = await proc.wait('stderr', /error/);

  console.log('@@', y.toString())
  console.log('@@@@', z.toString())
  // proc.write('hello');
  // proc.write('world');
  await x;
}

run().catch(console.error);
