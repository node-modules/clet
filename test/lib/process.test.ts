import path from 'node:path';
import assert from 'node:assert/strict';
import { Process } from '../../src/lib/process';

describe('test/process.test.ts', () => {
  it('should merge options', () => {
    const proc = new Process('fork', 'fixtures/process/fork.ts', ['--foo', 'bar'], {
      nodeOptions: ['--inspect-brk'],
    });

    assert.strictEqual(proc.opts.cwd, process.cwd());
    assert.strictEqual(proc.opts.nodeOptions?.[0], '--inspect-brk');
  });

  it('should spawn', async () => {
    const proc = new Process('spawn', 'node', ['-p', 'process.version', '--inspect'], {});
    await proc.start();
    await proc.end();
    // console.log(proc.result);
    assert.match(proc.result.stdout, /v\d+\.\d+\.\d+/);
    assert.match(proc.result.stderr, /Debugger listening on/);
    assert.strictEqual(proc.result.exitCode, 0);
  });

  it('should fork', async () => {
    const cli = path.resolve(__dirname, '../fixtures/process/fork.ts');
    const proc = new Process('fork', cli);
    await proc.start();
    await proc.end();
    // console.log(proc.result);
    assert.match(proc.result.stdout, /v\d+\.\d+\.\d+/);
    assert.match(proc.result.stderr, /this is testing/);
    assert.strictEqual(proc.result.exitCode, 0);
  });

  it('should spawn not-exits', async () => {
    const proc = new Process('spawn', 'not-exists');
    await proc.start();
    await proc.end();
    // console.log(proc.result);
    assert.match(proc.result.stderr, /Command failed with ENOENT/);
    assert.strictEqual(proc.result.exitCode, 127);
  });

  it('should fork not-exits', async () => {
    const proc = new Process('fork', 'not-exists.ts');
    await proc.start();
    await proc.end();
    assert.match(proc.result.stderr, /Cannot find module/);
    assert.strictEqual(proc.result.exitCode, 1);
  });

  it('should strip color', async () => {
    const cli = path.resolve(__dirname, '../fixtures/process/color.ts');
    const proc = new Process('fork', cli, []);
    await proc.start();
    await proc.end();
    // console.log(proc.result);
    assert.match(proc.result.stdout, /CLIHub/);
    assert.match(proc.result.stderr, /MSGHub/);
    assert.strictEqual(proc.result.exitCode, 0);
  });

  it('should exit with fail', async () => {
    const cli = path.resolve(__dirname, '../fixtures/process/error.ts');
    const proc = new Process('fork', cli, []);
    await proc.start();
    await proc.end().catch(err => err);
    // console.log(proc.result);
    assert.match(proc.result.stdout, /this is an error test/);
    assert.match(proc.result.stderr, /Error: some error/);
    assert.strictEqual(proc.result.exitCode, 1);
  });

  it.skip('should env()');

  it.skip('should cwd()');

  it.skip('should write()');

  it.skip('should kill()');

  it.skip('should await()');

  // it.skip('should execa work', async () => {
  //   const proc = execa.node('src/try/child.ts', ['--foo', 'bar'], {
  //     nodeOptions: [ '--require', 'ts-node/register' ],
  //   });

  //   proc.stdout?.on('data', data => {
  //     console.log('stdout', data.toString());
  //   });
  //   // proc.stdin.setEncoding('utf8');

  //   // const stdin = new PassThrough();
  //   // stdin.pipe(proc.stdin);

  //   setTimeout(() => {
  //     console.log('write stdin');
  //     proc.stdin?.write('hello\n');
  //     proc.stdin?.end();
  //     // stdin.end();
  //   }, 1500);

  //   await proc;
  // });
});
