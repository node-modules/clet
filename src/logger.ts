import { strict as assert } from 'assert';
import util from 'util';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  LOG = 2,
  INFO = 3,
  DEBUG = 4,
  TRACE = 5,
  SILENT = -Infinity,
  VERBOSE = Infinity,
}

interface LoggerOptions {
  tag?: string | string [];
  level?: LogLevel;
  indent?: number;
  showTag?: boolean;
  showTime?: boolean;
}

export class Logger {
  readonly options: {
    tag: string[];
    level: LogLevel;
    indent: number;
    showTag: boolean;
    showTime: boolean;
  };
  readonly childMaps: Record<string, Logger>;

  constructor(tag = '', opts: LoggerOptions = {}) {
    if (typeof tag === 'string') {
      opts.tag = opts.tag || tag || '';
    } else {
      opts = tag;
    }
    const normalizedTag: string[] = ([] as Array<string>).concat(opts.tag || []);

    this.options = {
      level: opts.level ?? LogLevel.INFO,
      indent: opts.indent ?? 0,
      showTag: opts.showTag ?? true,
      showTime: opts.showTag ?? false,
      tag: normalizedTag,
    };

    this.childMaps = {};
  }

  error(message?: any, ...optionalParams: any[]) {
    if (LogLevel.ERROR > this.options.level) return;
    const msg = this.format(message, optionalParams, this.options);
    return console.error(msg);
  }

  warn(message?: any, ...optionalParams: any[]) {
    if (LogLevel.WARN > this.options.level) return;
    const msg = this.format(message, optionalParams, this.options);
    return console.warn(msg);
  }

  log(message?: any, ...optionalParams: any[]) {
    if (LogLevel.LOG > this.options.level) return;
    const msg = this.format(message, optionalParams, this.options);
    return console.log(msg);
  }

  info(message?: any, ...optionalParams: any[]) {
    if (LogLevel.INFO > this.options.level) return;
    const msg = this.format(message, optionalParams, this.options);
    return console.info(msg);
  }

  debug(message?: any, ...optionalParams: any[]) {
    if (LogLevel.DEBUG > this.options.level) return;
    const msg = this.format(message, optionalParams, this.options);
    return console.debug(msg);
  }

  trace(message?: any, ...optionalParams: any[]) {
    if (LogLevel.TRACE > this.options.level) return;
    const msg = this.format(message, optionalParams, this.options);
    return console.trace(msg);
  }

  silent(message?: any, ...optionalParams: any[]) {
    if (LogLevel.SILENT > this.options.level) return;
    const msg = this.format(message, optionalParams, this.options);
    return console.debug(msg);
  }

  verbose(message?: any, ...optionalParams: any[]) {
    if (LogLevel.VERBOSE > this.options.level) return;
    const msg = this.format(message, optionalParams, this.options);
    return console.debug(msg);
  }

  format(message: any, args: any[], options: {
    showTime?: boolean;
    showTag?: boolean;
    tag?: string[];
    indent: number;
  }) {
    const time = options.showTime ? `[${formatTime(new Date())}] ` : '';
    const tag = options.showTag && options.tag!.length ? `[${options.tag!.join(':')}] ` : '';
    const indent = ' '.repeat(options.indent);
    const prefix = time + indent + tag;
    const content = util.format(message, ...args).replace(/^/gm, prefix);
    return content;
  }

  get level() {
    return this.options.level;
  }

  set level(v: LogLevel | string) {
    this.options.level = normalize(v);
  }

  child(tag: string, opts: LoggerOptions) {
    if (!this.childMaps[tag]) {
      this.childMaps[tag] = new Logger('', {
        ...this.options,
        indent: this.options.indent + 2,
        ...opts,
        tag: [ ...this.options.tag, tag ],
      } as LoggerOptions);
    }
    return this.childMaps[tag];
  }
}

function normalize(level: number | string): LogLevel {
  if (typeof level === 'number') return level;
  const levelNum = LogLevel[level.toUpperCase()];
  assert(levelNum, `unknown loglevel ${level}`);
  return levelNum;
}

function formatTime(date: Date): string {
  date = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return date.toISOString()
    .replace('T', ' ')
    .replace(/\..+$/, '');
}

