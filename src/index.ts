import * as validator from './plugins/validator';
import * as operation from './plugins/operation';
import { TestRunner, RunnerOptions, PluginLike } from './runner';

export * from './runner';
export * as assert from './lib/assert';

export function runner(opts?: RunnerOptions) {
  return new TestRunner(opts)
    .plugin({ ...validator, ...operation } satisfies PluginLike);
}
