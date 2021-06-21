import { request as curl, Agent } from 'undici';

export function request(url, options, fn) {
  return this._addChain(async ctx => {
    const agent = new Agent({
      keepAliveTimeout: 10,
      keepAliveMaxTimeout: 10,
    });

    const res = await curl(url, {
      // opaque: ctx,
      dispatcher: agent,
      ...options,
    });

    const result = {
      ...res,
      ctx,
      async text() {
        let res = '';
        for await (const data of result.body) {
          res += data.toString();
        }
        return res;
      },
      async json() {
        const str = await result.text();
        return JSON.parse(str);
      },
    };

    return await fn(result);
  });
}
