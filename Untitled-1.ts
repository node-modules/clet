
class TestRunner {
  // TODO: write a gymnastics for this.
  plugin(plugins) {
    for (const key of Object.keys(plugins)) {
      const initFn = plugins[key];
      this[key] = (...args) => {
        initFn(this, ...args);
        return this;
      };
    }
    return this;
  }
  end() {
    console.log('done');
  }
}

// test case
const test_plugins = {
  stdout(runner: TestRunner, expected: string) {
    console.log('stdout', expected);
  },
  code(runner: TestRunner, expected: number) {
    console.log('code', expected);
  },
};

new TestRunner()
  .plugin({ ...test_plugins })
  // should know the type of arg1
  .stdout('a test')
  // should invalid, expected is not string
  .stdout(/aaaa/)
  .code(0)
  .end();

// invalid case
const invalidPlugin = {
  // invalid plugin, the first params should be runner: TestRunner
  xx: (str: string) => {
    console.log('### xx', typeof str);
  },
};

new TestRunner()
  .plugin({ ...test_plugins, ...invalidPlugin })
  .stdout('a test')
  .xx('a test')
  .code(0)
  .end();
