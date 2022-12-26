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
