import EventEmitter from 'node:events';
import { PassThrough } from 'node:stream';
import { EOL } from 'node:os';

import * as execa from 'execa';
import { NodeOptions, ExecaReturnValue, ExecaChildProcess } from 'execa';
import pEvent from 'p-event';
import stripFinalNewline from 'strip-final-newline';
import stripAnsi from 'strip-ansi';

export type ProcessOptions = {
  -readonly [ key in keyof NodeOptions ]: NodeOptions[key];
} & {
  execArgv?: NodeOptions['nodeOptions'];
};

export type ProcessResult = ExecaReturnValue;
export type ProcessEvents = 'stdout' | 'stderr' | 'message' | 'exit' | 'close';

export class Process extends EventEmitter {
  type: 'fork' | 'spawn';
  cmd: string;
  args: string[];
  opts: ProcessOptions;
  result: ProcessResult;
  proc: ExecaChildProcess;

  constructor(type: Process['type'], cmd: string, args: string[] = [], opts: ProcessOptions = {}) {
    super();
    // assert(!this.cmd, 'cmd can not be registered twice');

    this.type = type;
    this.cmd = cmd;
    this.args = args;
    // this.cwd = opts?.cwd || process.cwd();
    // this.env = opts?.env || process.env;

    const { execArgv, nodeOptions, ...restOpts } = opts;
    // TODO: execArgv nodeOptions only allow once and in fork mode

    this.opts = {
      reject: false,
      cwd: process.cwd(),
      nodeOptions: execArgv || nodeOptions,
      input: new PassThrough(),
      preferLocal: true,
      ...restOpts,
    };

    // stdout stderr use passthrough, so don't need to on event and recollect
    // need to test color

    this.result = {
      stdout: '',
      stderr: '',
    } as any;
  }

  write(data: string) {
    // FIXME: when stdin.write, stdout will recieve duplicate output
    // auto add \n
    this.proc.stdin!.write(data.replace(/\r?\n$/, '') + EOL);
    // (this.opts.input as PassThrough).write(data);
    // (this.opts.stdin as Readable).write(data);

    // hook rl event to find whether prompt is trigger?
  }

  env(key: string, value: string) {
    this.opts.env![key] = value;
  }

  cwd(cwd: string) {
    this.opts.cwd = cwd;
  }

  async start() {
    if (this.type === 'fork') {
      this.proc = execa.node(this.cmd, this.args, this.opts);
    } else {
      const cmdString = [ this.cmd, ...this.args ].join(' ');
      this.proc = execa.command(cmdString, this.opts);
    }

    this.proc.then(res => {
      this.result = {
        ...res,
        ...this.result,
      };

      if (res instanceof Error) {
        // when spawn not exist, code is ENOENT
        const { code, message } = res as any;
        if (code === 'ENOENT') {
          this.result.exitCode = 127;
          this.result.stderr += message;
        }
      }
    });

    this.proc.stdout!.on('data', data => {
      const origin = stripFinalNewline(data.toString());
      const content = stripAnsi(origin);
      this.result.stdout += content;
      this.emit('stdout', origin);
    });

    this.proc.stderr!.on('data', data => {
      const origin = stripFinalNewline(data.toString());
      const content = stripAnsi(origin);
      this.result.stderr += content;
      this.emit('stderr', origin);
    });

    this.proc.on('message', data => {
      this.emit('message', data);
      // console.log('message event:', data);
    });

    // this.proc.once('exit', code => {
    //   this.result.exitCode = code;
    //   // console.log('close event:', code);
    // });

    // this.proc.on('error', err => {
    //   console.log('@@error', err);
    // });

    // this.proc.once('close', code => {
    //   // this.emit('close', code);
    //   this.result.code = code;
    //   // console.log('close event:', code);
    // });
    // return this.proc;
    return this;
  }

  async end() {
    return this.proc;
  }

  kill(signal?: string) {
    // TODO: kill process use cancel()?
    this.proc.kill(signal);
  }

  // stdin -> wait(stdout) -> write
  async wait(type: ProcessEvents, expected) {
    let promise;
    switch (type) {
      case 'stdout':
      case 'stderr': {
        promise = pEvent(this.proc[type] as any, 'data', {
          rejectionEvents: ['close'],
          filter: () => {
            return expected.test(this.result[type]);
          },
        }); // .then(() => this.result[type]);
        break;
      }


      case 'message': {
        promise = pEvent(this.proc, 'message', {
          rejectionEvents: ['close'],
          // filter: input => utils.validate(input, expected),
        });
        break;
      }

      case 'exit': {
        promise = pEvent(this.proc, 'exit');
        break;
      }

      case 'close':
      default: {
        promise = pEvent(this.proc, 'close');
        break;
      }
    }
    return promise;
  }
}

// use readable stream to write stdin
