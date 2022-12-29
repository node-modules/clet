import path from 'node:path';
import assert from 'node:assert/strict';
import type { TestRunner } from '../runner';
import { matchRule, doesNotMatchRule, matchFile, doesNotMatchFile } from '../lib/assert';

export function stdout(runner: TestRunner, expected: string | RegExp) {
  return runner.expect(async ctx => {
    matchRule(ctx.result.stdout, expected);
  });
}

export function notStdout(runner: TestRunner, expected: string | RegExp) {
  return runner.expect(async ctx => {
    doesNotMatchRule(ctx.result.stdout, expected);
  });
}

export function stderr(runner: TestRunner, expected: string | RegExp) {
  return runner.expect(async ctx => {
    matchRule(ctx.result.stderr, expected);
  });
}

export function notStderr(runner: TestRunner, expected: string | RegExp) {
  return runner.expect(async ({ result }) => {
    doesNotMatchRule(result.stderr, expected);
  });
}

export function file(runner: TestRunner, filePath: string, expected: string | RegExp) {
  return runner.expect(async ({ cwd }) => {
    const fullPath = path.resolve(cwd, filePath);
    await matchFile(fullPath, expected);
  });
}

export function notFile(runner: TestRunner, filePath: string, expected: string | RegExp) {
  return runner.expect(async ({ cwd }) => {
    const fullPath = path.resolve(cwd, filePath);
    await doesNotMatchFile(fullPath, expected);
  });
}

export function code(runner: TestRunner, expected: number) {
  runner.expect(async ctx => {
    ctx.autoCheckCode = false;
    // when using `.wait()`, it could maybe not exit at this time, so skip and will double check it later
    if (ctx.result.exitCode !== undefined) {
      assert.equal(ctx.result.exitCode, expected);
    }
  });

  // double check
  runner.hook('end', async ctx => {
    assert.equal(ctx.result.exitCode, expected);
  });

  return runner;
}
