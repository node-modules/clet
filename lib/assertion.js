export function stdout() {
  this._addAssertion(ctx => {
    ctx.logger.info('stdout');
  });
  return this;
}

