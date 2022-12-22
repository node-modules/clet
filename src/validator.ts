export function expect(runner, fn) {
  runner.hook('run', async () => {
    await fn(runner);
  });
}
