import { strict as assert } from 'assert';
import util from 'util';

export const LogLevel = {
  ERROR: 0,
  WARN: 1,
  LOG: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5,
  Silent: -Infinity,
  Verbose: Infinity,
};

export class Logger {
  constructor(opts = {}) {
    opts.tag = [].concat(opts.tag || []);
    this.options = {
      level: LogLevel.INFO,
      indent: 0,
      showTag: true,
      ...opts,
    };

    this.childMaps = {};

    this.console = new console.Console({
      stdout: process.stdout,
      stderr: process.stderr,
    });

    // register methods
    for (const [ key, value ] of Object.entries(LogLevel)) {
      const fnName = key.toLowerCase();
      const fn = this.console[ fnName ] || this.console.log;
      this[fnName] = (message, ...args) => {
        if (value > this.options.level) return;
        const msg = this.format(message, args, this.options);
        return fn(msg.replace(/\r?\n$/, ''));
      };
    }
  }

  format(message, args, options) {
    const tag = options.showTag && options.tag.length ? `[${options.tag.join(':')}] ` : '';
    const indent = ' '.repeat(options.indent);
    const prefix = indent + tag;
    const content = util.format(message, ...args).replace(/^/gm, prefix);
    return content;
  }

  get level() {
    return this._level;
  }

  set level(v) {
    this._level = normalize(v);
  }

  child(tag, opts) {
    if (!this.childMaps[tag]) {
      this.childMaps[tag] = new Logger({
        ...this.options,
        ...opts,
        tag: [ ...this.options.tag, tag ],
      });
    }
    return this.childMaps[tag];
  }
}

function normalize(level) {
  if (typeof level === 'number') return level;
  const levelNum = LogLevel[level.toUpperCase()];
  assert(levelNum, `unknown loglevel ${level}`);
  return levelNum;
}

