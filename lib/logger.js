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
    this.level = opts.level || 'INFO';
    this.tag = opts.tag;
    this.indent = opts.indent || 0;
    this.console = new console.Console({
      stdout: process.stdout,
      stderr: process.stderr,
    });

    // register methods
    for (const [ key, value ] of Object.entries(LogLevel)) {
      const fnName = key.toLowerCase();
      const fn = this.console[fnName];
      if (!fn) continue;
      this[fnName] = (first, ...args) => {
        if (value > this.level) return;
        const prefix = ' '.repeat(this.indent) + bracket(this.tag);
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
