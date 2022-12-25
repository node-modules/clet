import { defineConfig } from 'vitest/config';

export default defineConfig({
  // plugins: [ {
  //   name: 'vitest-setup-plugin',
  //   config: () => ({
  //     test: {
  //       setupFiles: [
  //         './setupFiles/add-something-to-global.ts',
  //         'setupFiles/without-relative-path-prefix.ts',
  //       ],
  //     },
  //   }),
  // } ],
  test: {
    globals: true,
    include: [ 'test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}' ],
    globalSetup: [
      // './test/setup.js',
    ],
  },
});
