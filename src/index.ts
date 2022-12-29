import * as validator from './plugins/validator';
import * as operation from './plugins/operation';
import { TestRunner, PluginLike } from './runner';

export * from './runner';
export * as assert from './lib/assert';

export function runner() {
  return new TestRunner()
    .plugin({ ...validator, ...operation } satisfies PluginLike);
}
