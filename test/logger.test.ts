import { jest, expect } from '@jest/globals';
import { Logger, LogLevel } from '../src/runner';

describe('test/logger.test.js', () => {
  beforeEach(() => {
    for (const name of [ 'error', 'warn', 'info', 'log', 'debug', 'trace' ]) {
      jest.spyOn(global.console, name as any);
    }
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should support level', () => {
    const logger = new Logger();
    expect(logger.level === LogLevel.INFO);

    logger.level = LogLevel.DEBUG;
    logger.debug('debug log');
    expect(console.debug).toHaveBeenCalledWith('debug log');

    logger.level = 'WARN';
    logger.info('info log');
    expect(console.info).not.toHaveBeenCalled();
  });

  it('should logger verbose', () => {
    const logger = new Logger({ level: LogLevel.VERBOSE });
    logger.error('error log');
    logger.warn('warn log');
    logger.log('log log');
    logger.info('info log');
    logger.debug('debug log');
    logger.trace('trace log');
    logger.silent('silent log');
    logger.verbose('verbose log');

    expect(console.error).toHaveBeenCalledWith('error log');
    expect(console.warn).toHaveBeenCalledWith('warn log');
    expect(console.log).toHaveBeenCalledWith('log log');
    expect(console.info).toHaveBeenCalledWith('info log');
    expect(console.debug).toHaveBeenCalledWith('debug log');
    expect(console.trace).toHaveBeenCalledWith('trace log');
    expect(console.debug).toHaveBeenCalledWith('silent log');
    expect(console.debug).toHaveBeenCalledWith('verbose log');
  });

  it('should logger as default', () => {
    const logger = new Logger();
    logger.error('error log');
    logger.warn('warn log');
    logger.info('info log');
    logger.debug('debug log');
    logger.verbose('verbose log');

    expect(console.error).toHaveBeenCalledWith('error log');
    expect(console.warn).toHaveBeenCalledWith('warn log');
    expect(console.info).toHaveBeenCalledWith('info log');
    expect(console.debug).not.toHaveBeenCalled();
  });

  it('should not logger if silent', () => {
    const logger = new Logger({ level: LogLevel.SILENT });
    logger.error('error log');
    logger.warn('warn log');
    logger.log('log log');
    logger.info('info log');
    logger.debug('debug log');
    logger.trace('trace log');
    logger.verbose('verbose log');

    expect(console.error).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.trace).not.toHaveBeenCalled();
  });

  it('should support tag/time', () => {
    const logger = new Logger({ tag: 'A', showTag: true, showTime: true });

    logger.info('info log');
    expect(console.info).toHaveBeenCalledWith(expect.stringMatching(/\[\d+-\d+-\d+ \d+:\d+:\d+\] \[A\] info log/));
  });

  it('should child()', () => {
    const logger = new Logger('A');
    const childLogger = logger.child('B', { showTag: true, showTime: true });
    expect(childLogger === logger.child('B'));
    childLogger.warn('info log');
    expect(console.warn).toHaveBeenCalledWith(expect.stringMatching(/\[\d+-\d+-\d+ \d+:\d+:\d+\]\s{3}\[A:B\] info log/));
  });
});
