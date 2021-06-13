export function stdout() {
  this.expect(ctx => {
    console.log(this, ctx, 'stdout');
  });
  return this;
}

