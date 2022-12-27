import type { TestRunner } from '../runner';

export function tap(runner: TestRunner, fn: (runner: TestRunner) => Promise<void>) {
  return runner.hook('after', async () => {
    await fn(runner);
  });
}
