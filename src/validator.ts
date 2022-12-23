export function expect(runner, fn) {
  runner.hook('postrun', async () => {
    await fn(runner);
  });
}

export function stdout(runner, expected) {
  assert(expected, '`expected` is required');
  expect(runner, async function stdout({ result, assert }) {
    assert.matchRule(result.stdout, expected);
  });
}

export function stderr(runner, expected) {
  runner.hook('postrun', async () => {
    assert.matchRule(result.stdout, expected);
  });

  runner.hook({
    async prerun() {
    },
    async postrun() {
    },
  });
}
