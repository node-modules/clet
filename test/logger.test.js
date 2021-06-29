
import { jest, expect } from '@jest/globals';
import { Logger, LogLevel } from '../lib/logger.js';

describe('test/logger.test.js', () => {
  beforeEach(() => {
    for (const name of [ 'error', 'warn', 'info', 'log', 'debug' ]) {
      jest.spyOn(global.console, name);
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
    const logger = new Logger({ level: LogLevel.Verbose });
    logger.error('error log');
    logger.warn('warn log');
    logger.info('info log');
    logger.debug('debug log');
    logger.verbose('verbose log');

    expect(console.error).toHaveBeenCalledWith('error log');
    expect(console.warn).toHaveBeenCalledWith('warn log');
    expect(console.info).toHaveBeenCalledWith('info log');
    expect(console.debug).toHaveBeenCalledWith('debug log');
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
