import { request as curl, Agent } from 'undici';

export function request(url, options, fn) {
  return this._addChain(async ctx => {
    const agent = new Agent({
      keepAliveTimeout: 10,
      keepAliveMaxTimeout: 10,
    });

    const result = await curl(url, {
      // opaque: ctx,
      dispatcher: agent,
      ...options,
    });

    return await fn({ ctx, ...result });
  });
}
