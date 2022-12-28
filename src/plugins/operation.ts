import type { TestRunner, HookFunction } from '../runner';

export function tap(runner: TestRunner, fn: HookFunction) {
  return runner.hook('after', async ctx => {
    await fn.call(runner, ctx);
  });
}
