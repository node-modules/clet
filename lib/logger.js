import consola from 'consola';

const { Consola, LogLevel, BasicReporter } = consola;
const LEVEL = Symbol('Logger#level');

class CIReporter extends BasicReporter {
  constructor(options = {}) {
    super({
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
      ...options,
    });
  }

  formatLogObj(logObj) {
    const message = this.formatArgs(logObj.args);

    if (logObj.type === 'log') {
      return `  ${message}`;
    }

    return this.filterAndJoin([
      this.formatDate(logObj.date),
      logObj.type.toUpperCase(),
      logObj.tag ? `[${logObj.tag}]` : '',
      message,
    ]);
  }
}

Object.defineProperty(LogLevel, 'normalize', {
  enumerable: false,
  value: level => {
    if (typeof level === 'number') return level;

    // 'WARN' => level.warn
    if (typeof level === 'string' && level) {
      return LogLevel[ level.charAt(0).toUpperCase() + level.slice(1).toLowerCase() ];
    }
  },
});

class Logger extends Consola {
  constructor(options = {}) {
    super(options);
    this.setReporters(new CIReporter());
  }

  set level(v) {
    this[LEVEL] = LogLevel.normalize(v);
  }

  get level() {
    return this[LEVEL];
  }

  _log(logObj) {
    // consola will tranform to lowercase, so let's revert it.
    logObj.tag = this._defaults.tag;
    super._log(logObj);
  }

  create(options) {
    return new Logger(Object.assign({
      reporters: this._reporters,
      level: this.level,
      types: this._types,
      defaults: this._defaults,
      stdout: this._stdout,
      stderr: this._stderr,
      mockFn: this._mockFn,
    }, options));
  }
}

export { LogLevel, Logger, CIReporter };
export default new Logger();
