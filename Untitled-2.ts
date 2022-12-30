
type MountPlugin<T, TestRunner> = {
  [key in keyof T]: T[key] extends (core: TestRunner, ...args: infer I) => any ? (...args: I) => MountPlugin<T, TestRunner> : undefined;
} & TestRunner;

interface PluginLike {
  [key: string]: (core: any, ...args: any[]) => any;
}

type RestParam<T> = T extends (first: any, ...args: infer R) => any ? R : any;

class TestRunner {
  // TODO: write a gymnastics for this.
  plugin<T extends PluginLike>(plugins: T): MountPlugin<T, this> {
    for (const key of Object.keys(plugins)) {
      const initFn = plugins[key];
      (this as any)[key] = (...args: RestParam<typeof initFn>) => {
        initFn(this, ...args);
        return this;
      };
    }
    return this as any;
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
  .plugin({ ...test_plugins } satisfies PluginLike)
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
  .plugin({ ...test_plugins, ...invalidPlugin } satisfies PluginLike)
  .stdout('a test')
  .xx('a test')
  .code(0)
  .end();
