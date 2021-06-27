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
    this.options = {
      level: LogLevel.INFO,
      indent: 0,
      showTag: true,
      ...opts,
    };

    this.console = new console.Console({
      stdout: process.stdout,
      stderr: process.stderr,
    });

    this.childMaps = {};

    // register methods
    for (const [ key, value ] of Object.entries(LogLevel)) {
      const fnName = key.toLowerCase();
      const fn = this.console[fnName];
      if (!fn) continue;
      this[fnName] = (first, ...args) => {
        if (value > this.options.level) return;
        const prefix = ' '.repeat(this.options.indent) + (this.options.showTag ? bracket(this.options.tag) : '');
        return fn(`${prefix}${first}`, ...args);
      };
    }
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
        tag,
      });
    }
    return this.childMaps[tag];
  }
}

function normalize(level) {
  if (typeof level === 'number') return level;

  // 'WARN' => level.warn
  if (typeof level === 'string' && level) {
    return LogLevel[level.toUpperCase()];
  }
}

function bracket(str) {
  return str ? `[${str}] ` : '';
}

// const logger = new Logger({ indent: 2, level: 'WARN' });

// logger.debug('debug')
// logger.info('info')
// logger.warn('warn')
// logger.error('error')
