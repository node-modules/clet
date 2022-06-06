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
  constructor(tag = '', opts = {}) {
    if (typeof tag === 'string') {
      opts.tag = opts.tag || tag || '';
    } else {
      opts = tag;
    }
    opts.tag = [].concat(opts.tag || []);

    this.options = {
      level: LogLevel.INFO,
      indent: 0,
      showTag: true,
      showTime: false,
      ...opts,
    };

    this.childMaps = {};

    // register methods
    for (const [ key, value ] of Object.entries(LogLevel)) {
      const fnName = key.toLowerCase();
      const fn = console[fnName] || console.debug;
      this[fnName] = (message, ...args) => {
        if (value > this.options.level) return;
        const msg = this.format(message, args, this.options);
        return fn(msg);
      };
    }
  }

  format(message, args, options) {
    const time = options.showTime ? `[${formatTime(new Date())}] ` : '';
    const tag = options.showTag && options.tag.length ? `[${options.tag.join(':')}] ` : '';
    const indent = ' '.repeat(options.indent);
    const prefix = time + indent + tag;
    const content = util.format(message, ...args).replace(/^/gm, prefix);
    return content;
  }

  get level() {
    return this.options.level;
  }

  set level(v) {
    this.options.level = normalize(v);
  }

  child(tag, opts) {
    assert(tag, 'tag is required');
    if (!this.childMaps[tag]) {
      this.childMaps[tag] = new Logger({
        ...this.options,
        indent: this.options.indent + 2,
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

function formatTime(date) {
  date = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return date.toISOString()
    .replace('T', ' ')
    .replace(/\..+$/, '');
}

