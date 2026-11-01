import { errorReporting } from '../../services/error-reporting';

// Mock error-reporting locally for this test file
jest.mock('../../services/error-reporting', () => ({
  errorReporting: {
    addBreadcrumb: jest.fn(),
    captureException: jest.fn(),
    captureMessage: jest.fn(),
  },
  ErrorSeverity: {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
  },
}));

// Load the actual Logger module using jest.requireActual
const { Logger } = jest.requireActual('../../services/logger');

describe('Logger Service - Development Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log debug messages in dev', () => {
    const spy = jest.spyOn(console, 'debug').mockImplementation();
    Logger.debug('test debug', { data: 1 });
    expect(spy).toHaveBeenCalledWith('[DEBUG] test debug', { data: 1 });
    spy.mockRestore();
  });

  it('should log info messages in dev', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    Logger.info('test info', { data: 1 });
    expect(spy).toHaveBeenCalledWith('[INFO] test info', { data: 1 });
    expect(errorReporting.addBreadcrumb).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should log warn messages in dev', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    Logger.warn('test warn', { data: 1 });
    expect(spy).toHaveBeenCalledWith('[WARN] test warn', { data: 1 });
    expect(errorReporting.addBreadcrumb).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should log error messages and capture them in dev', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('test error');
    
    Logger.error('error msg', error, { extra: 2 });
    expect(spy).toHaveBeenCalledWith('[ERROR] error msg', error, { extra: 2 });
    expect(errorReporting.captureException).toHaveBeenCalledWith(error, {
      extra: { message: 'error msg', extra: 2 },
    });

    Logger.error('error msg 2', 'not an error');
    expect(errorReporting.captureMessage).toHaveBeenCalledWith('error msg 2', 'error');
    spy.mockRestore();
  });

  it('should log user actions', () => {
    Logger.action('click_button', { btn: 'submit' });
    expect(errorReporting.addBreadcrumb).toHaveBeenCalledWith({
      message: 'click_button',
      category: 'user_action',
      level: 'info',
      data: { btn: 'submit' },
    });
  });

  it('should log navigation', () => {
    Logger.navigation('Home', 'Profile');
    expect(errorReporting.addBreadcrumb).toHaveBeenCalledWith({
      message: 'Home → Profile',
      category: 'navigation',
      level: 'info',
    });
  });
});

describe('Logger Service - Production Mode', () => {
  let prodLogger: typeof Logger;

  beforeAll(() => {
    // Force __DEV__ to false and reload the module using requireActual
    global.__DEV__ = false;
    jest.isolateModules(() => {
      prodLogger = jest.requireActual('../../services/logger').Logger;
    });
  });

  afterAll(() => {
    global.__DEV__ = true;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should NOT log debug messages in prod', () => {
    const spy = jest.spyOn(console, 'debug').mockImplementation();
    prodLogger.debug('test debug');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should route info to Sentry breadcrumbs in prod', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation();
    prodLogger.info('prod info', { key: 'val' });
    expect(spy).not.toHaveBeenCalled();
    expect(errorReporting.addBreadcrumb).toHaveBeenCalledWith({
      message: 'prod info',
      category: 'info',
      level: 'info',
      data: { key: 'val' },
    });
    spy.mockRestore();
  });

  it('should route warn to Sentry breadcrumbs in prod', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    prodLogger.warn('prod warn', { key: 'val' });
    expect(spy).not.toHaveBeenCalled();
    expect(errorReporting.addBreadcrumb).toHaveBeenCalledWith({
      message: 'prod warn',
      category: 'warning',
      level: 'warning',
      data: { key: 'val' },
    });
    spy.mockRestore();
  });

  it('should NOT console.error in prod but still capture exception', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('prod error');
    prodLogger.error('error msg', error, { extra: 2 });
    expect(spy).not.toHaveBeenCalled();
    expect(errorReporting.captureException).toHaveBeenCalledWith(error, {
      extra: { message: 'error msg', extra: 2 },
    });
    spy.mockRestore();
  });
});
