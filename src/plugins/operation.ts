import type { TestRunner, HookFunction } from '../runner';

export function tap1(runner: TestRunner, fn: HookFunction) {
  return runner.hook('after', async ctx => {
    await fn.call(runner, ctx);
  });
}
