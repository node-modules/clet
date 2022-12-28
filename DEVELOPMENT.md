   // prepare/prerun
    //   - init dir, init env, init ctx
    // run
    //   - run cli
    //   - collect stdout/stderr, emit event
    //   - stdin (expect)
    // postrun
    //   - wait event(end, message, error, stdout, stderr)
    //   - check assert
    // end
    //   - clean up, kill, log result, error hander

    // console.log(this.middlewares);
    // return Promise.all(this.middlewares.map(fn => fn()));

    // prepare: [],
    // prerun: [],
    // run: [],
    // postrun: [],

// koa middleware
// 初始化 -> fork -> await next() -> 校验 -> 结束


  // prepare 准备现场环境
  // prerun 检查参数，在 fork 定义之后
  // run 处理 stdin
  // postrun 检查 assert
  // end 检查 code，清理现场，相当于 finnaly
