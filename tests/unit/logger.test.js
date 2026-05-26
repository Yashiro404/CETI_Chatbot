const { log } = require('../../modules/logger');

describe('logger', () => {
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('log info uses console.log with correct format', () => {
    log('info', 'Server started');
    expect(console.log).toHaveBeenCalledTimes(1);
    const output = console.log.mock.calls[0][0];
    expect(output).toMatch(/^\[.+\] \[INFO\] Server started$/);
    const timestamp = output.match(/^\[(.+?)\]/)[1];
    expect(timestamp).toMatch(isoRegex);
  });

  test('log warn uses console.warn with correct format', () => {
    log('warn', 'Low memory');
    expect(console.warn).toHaveBeenCalledTimes(1);
    const output = console.warn.mock.calls[0][0];
    expect(output).toMatch(/^\[.+\] \[WARN\] Low memory$/);
  });

  test('log error uses console.error with correct format', () => {
    log('error', 'Connection failed');
    expect(console.error).toHaveBeenCalledTimes(1);
    const output = console.error.mock.calls[0][0];
    expect(output).toMatch(/^\[.+\] \[ERROR\] Connection failed$/);
  });
});
