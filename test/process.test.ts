import path from 'node:path';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { it, describe } from 'vitest';
import execa from 'execa';
import { Process } from '../src/process.js';
import fs from 'fs';

describe('test/process.test.ts', () => {
  describe('options', () => {
    it('should merge options', () => {
      const proc = new Process('fork', 'src/try/child.ts', ['--foo', 'bar'], {
        nodeOptions: ['--inspect-brk'],
      });

      assert.strictEqual(proc.opts.cwd, process.cwd());
      assert.strictEqual(proc.opts.nodeOptions?.[0], '--inspect-brk');
    });
  });

  it('should spawn', async () => {
    const proc = new Process('spawn', 'node', ['-p', 'process.version', '--inspect'], {});
    await proc.exec();
    // console.log(proc.result);
    assert.match(proc.result.stdout, /v\d+\.\d+\.\d+/);
    assert.match(proc.result.stderr, /Debugger listening on/);
    assert.strictEqual(proc.result.code, 0);
  });

  it('should fork', async () => {
    const cli = path.resolve(__dirname, 'fixtures/version.ts');
    const proc = new Process('fork', cli, [], { nodeOptions: ['--inspect'] });
    await proc.exec();
    // console.log(proc.result);
    assert.match(proc.result.stdout, /v\d+\.\d+\.\d+/);
    assert.match(proc.result.stderr, /Debugger listening on/);
    assert.strictEqual(proc.result.code, 0);
  });

  it('should strip color', async () => {
    const cli = path.resolve(__dirname, 'fixtures/color.ts');
    const proc = new Process('fork', cli, []);
    await proc.exec();
    console.log(proc.result);
    assert.match(proc.result.stdout, /CLIHub/);
    assert.match(proc.result.stderr, /MSGHub/);
    assert.strictEqual(proc.result.code, 0);
  });


  it.skip('should execa work', async () => {
    const proc = execa.node('src/try/child.ts', ['--foo', 'bar'], {
      nodeOptions: [ '--require', 'ts-node/register' ],
    });

    proc.stdout.on('data', data => {
      console.log('stdout', data.toString());
    });
    proc.stdin.setEncoding('utf8');

    // const stdin = new PassThrough();
    // stdin.pipe(proc.stdin);

    setTimeout(() => {
      console.log('write stdin');
      proc.stdin.write('hello\n');
      proc.stdin?.end();
      // stdin.end();
    }, 1500);

    await proc;
  });
});
