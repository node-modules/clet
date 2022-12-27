// import assert from 'node:assert/strict';
// import util from 'node:util';

// export enum LogLevel {
//   ERROR = 0,
//   WARN = 1,
//   LOG = 2,
//   INFO = 3,
//   DEBUG = 4,
//   TRACE = 5,
//   Silent = -Infinity,
//   Verbose = Infinity,
// }

// export interface LoggerOptions {
//   level?: LogLevel;
//   tag?: string | string[];
//   showTag?: boolean;
//   showTime?: boolean;
//   indent?: number;
// }

// type LogMethods = {
//   [key in Lowercase<keyof typeof LogLevel>]: (message: any, ...args: any[]) => void;
// };

// export interface Logger extends LogMethods { }

// export class Logger {
//   private options: LoggerOptions;
//   private childMaps: Record<string, Logger>;

//   // Declare the type of the dynamically-registered methods
//   // [key in Lowercase<keyof typeof LogLevel>]: (message: any, ...args: any[]) => void;

//   constructor(tag?: string | LoggerOptions, opts: LoggerOptions = {}) {
//     if (typeof tag === 'string') {
//       opts.tag = opts.tag || tag || '';
//     } else {
//       opts = tag;
//     }
//     opts.tag = [].concat(opts.tag || []);

//     this.options = {
//       level: LogLevel.INFO,
//       indent: 0,
//       showTag: true,
//       showTime: false,
//       ...opts,
//     };

//     this.childMaps = {};

//     // register methods
//     for (const [ key, value ] of Object.entries(LogLevel)) {
//       const fnName = key.toLowerCase();
//       const fn = console[fnName] || console.debug;
//       this[fnName] = (message: any, ...args: any[]) => {
//         if (value > this.options.level) return;
//         const msg = this.format(message, args, this.options);
//         return fn(msg);
//       };
//     }

//     return this as unknown as typeof Logger.prototype & LogMethods;
//   }

//   format(message: any, args: any[], options?: LoggerOptions) {
//     const time = options.showTime ? `[${formatTime(new Date())}] ` : '';
//     const tag = options.showTag && options.tag.length ? `[${options.tag.join(':')}] ` : '';
//     const indent = ' '.repeat(options.indent);
//     const prefix = time + indent + tag;
//     const content = util.format(message, ...args).replace(/^/gm, prefix);
//     return content;
//   }

//   get level() {
//     return this.options.level;
//   }

//   set level(v: number | string) {
//     this.options.level = normalize(v);
//   }

//   child(tag: string, opts?: LoggerOptions) {
//     assert(tag, 'tag is required');
//     if (!this.childMaps[tag]) {
//       this.childMaps[tag] = new Logger({
//         ...this.options,
//         indent: this.options.indent + 2,
//         ...opts,
//         tag: [ ...this.options.tag, tag ],
//       });
//     }
//     return this.childMaps[tag];
//   }
// }

// function normalize(level: number | string) {
//   if (typeof level === 'number') return level;
//   const levelNum = LogLevel[level.toUpperCase()];
//   assert(levelNum, `unknown loglevel ${level}`);
//   return levelNum;
// }

// function formatTime(date: Date) {
//   date = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
//   return date.toISOString()
//     .replace('T', ' ')
//     .replace(/\..+$/, '');
// }

