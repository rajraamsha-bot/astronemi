/**
 * Tests for Error Reporting Service
 */

describe('ErrorReportingService', () => {
  let errorReporting: typeof import('@/services/error-reporting').errorReporting;

  beforeEach(() => {
    jest.resetModules();
    errorReporting = require('@/services/error-reporting').errorReporting;
    // Don't initialize — Sentry DSN is not set in tests
  });

  afterEach(() => {
    errorReporting.destroy();
  });

  it('should be a singleton instance', () => {
    const a = require('@/services/error-reporting').errorReporting;
    const b = require('@/services/error-reporting').errorReporting;
    expect(a).toBe(b);
  });

  it('should not crash when Sentry is not initialized', () => {
    expect(() => {
      errorReporting.captureException(new Error('test'));
    }).not.toThrow();
  });

  it('should not crash when capturing message without Sentry', () => {
    const { ErrorSeverity } = require('@/services/error-reporting');
    expect(() => {
      errorReporting.captureMessage('test message', ErrorSeverity.INFO);
    }).not.toThrow();
  });

  it('should not crash when adding breadcrumb without Sentry', () => {
    const { ErrorSeverity } = require('@/services/error-reporting');
    expect(() => {
      errorReporting.addBreadcrumb({
        message: 'test breadcrumb',
        category: 'test',
        level: ErrorSeverity.INFO,
      });
    }).not.toThrow();
  });

  it('should not crash when setting user without Sentry', () => {
    expect(() => {
      errorReporting.setUser({ id: 'user-1', email: 'test@test.com' });
    }).not.toThrow();
  });

  it('should not crash when setting null user without Sentry', () => {
    expect(() => {
      errorReporting.setUser(undefined);
    }).not.toThrow();
  });

  it('should not crash when setting tags without Sentry', () => {
    expect(() => {
      errorReporting.setTags({ env: 'test' });
    }).not.toThrow();
  });

  it('should not crash when setting extra without Sentry', () => {
    expect(() => {
      errorReporting.setExtra('key', 'value');
    }).not.toThrow();
  });

  it('should not crash when tracking navigation without Sentry', () => {
    expect(() => {
      errorReporting.trackNavigation('Home', 'Profile');
    }).not.toThrow();
  });

  it('should not crash when tracking action without Sentry', () => {
    expect(() => {
      errorReporting.trackAction('button_click', { button: 'submit' });
    }).not.toThrow();
  });

  it('should not crash when tracking API call without Sentry', () => {
    expect(() => {
      errorReporting.trackApiCall('/api/users', 'GET', 150, 200);
    }).not.toThrow();
  });

  it('should return null for startTransaction without Sentry', () => {
    const result = errorReporting.startTransaction('test-transaction', 'navigation');
    expect(result).toBeNull();
  });

  it('should not crash when calling test without Sentry', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    errorReporting.test();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Not initialized'),
    );
    consoleSpy.mockRestore();
  });

  it('should not crash when destroying', () => {
    expect(() => {
      errorReporting.destroy();
    }).not.toThrow();
  });

  it('should handle initialize when DSN is placeholder', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    await errorReporting.initialize();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('placeholder'),
    );
    consoleSpy.mockRestore();
  });

  it('should handle multiple destroy calls', () => {
    errorReporting.destroy();
    expect(() => {
      errorReporting.destroy();
    }).not.toThrow();
  });
});

describe('ErrorSeverity enum', () => {
  it('should have correct values', () => {
    const { ErrorSeverity } = require('@/services/error-reporting');
    expect(ErrorSeverity.FATAL).toBe('fatal');
    expect(ErrorSeverity.ERROR).toBe('error');
    expect(ErrorSeverity.WARNING).toBe('warning');
    expect(ErrorSeverity.INFO).toBe('info');
    expect(ErrorSeverity.DEBUG).toBe('debug');
  });
});