/**
 * Crash Reporting Service Tests
 */

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock React Native
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

// Mock Sentry
const mockSentryInit = jest.fn();
const mockSentrySetUser = jest.fn();
const mockSentryAddBreadcrumb = jest.fn();
const mockSentryCaptureException = jest.fn();
const mockSentryCaptureMessage = jest.fn();
const mockSentrySetTags = jest.fn();
const mockSentrySetExtra = jest.fn();

jest.mock('@sentry/react-native', () => ({
  init: mockSentryInit,
  setUser: mockSentrySetUser,
  addBreadcrumb: mockSentryAddBreadcrumb,
  captureException: mockSentryCaptureException,
  captureMessage: mockSentryCaptureMessage,
  setTags: mockSentrySetTags,
  setExtra: mockSentrySetExtra,
  ReactNativeTracing: jest.fn(),
  ReactNavigationInstrumentation: jest.fn(),
}), { virtual: true });

// Import service after mocks
import { crashReportingService, ErrorSeverity } from '@/services/crash-reporting';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as errorReportingModule from '@/services/error-reporting';

describe('Crash Reporting Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(errorReportingModule.errorReporting, 'init').mockResolvedValue(undefined);
    jest.spyOn(errorReportingModule.errorReporting, 'initialize').mockResolvedValue(undefined);
    jest.spyOn(errorReportingModule.errorReporting, 'setUser').mockImplementation(() => {});
    jest.spyOn(errorReportingModule.errorReporting, 'addBreadcrumb').mockImplementation(() => {});
    jest.spyOn(errorReportingModule.errorReporting, 'captureException').mockImplementation(() => {});
    jest.spyOn(errorReportingModule.errorReporting, 'captureMessage').mockImplementation(() => {});
    jest.spyOn(errorReportingModule.errorReporting, 'setTags').mockImplementation(() => {});
    jest.spyOn(errorReportingModule.errorReporting, 'setExtra').mockImplementation(() => {});
  });

  describe('Initialization', () => {
    it('should call errorReporting.init when init is called', async () => {
      await crashReportingService.init();
      
      expect(errorReportingModule.errorReporting.init).toHaveBeenCalled();
    });

    it('should call errorReporting.initialize when initialize is called', async () => {
      await crashReportingService.initialize();
      
      expect(errorReportingModule.errorReporting.initialize).toHaveBeenCalled();
    });
  });

  describe('setUser', () => {
    it('should store user in AsyncStorage when user is provided', async () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      };

      await crashReportingService.setUser(user);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'crash_reporting_user',
        JSON.stringify(user)
      );
    });

    it('should call errorReporting.setUser with the user object', async () => {
      const user = { id: 'user123', email: 'test@example.com' };

      await crashReportingService.setUser(user);

      expect(errorReportingModule.errorReporting.setUser).toHaveBeenCalledWith(user);
    });

    it('should remove user from AsyncStorage when undefined is passed', async () => {
      await crashReportingService.setUser(undefined);
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('crash_reporting_user');
    });

    it('should call errorReporting.setUser with undefined when clearing user', async () => {
      await crashReportingService.setUser(undefined);
      
      expect(errorReportingModule.errorReporting.setUser).toHaveBeenCalledWith(undefined);
    });
  });

  describe('clearUser', () => {
    it('should remove user from AsyncStorage', async () => {
      await crashReportingService.clearUser();
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('crash_reporting_user');
    });

    it('should call errorReporting.setUser with undefined', async () => {
      await crashReportingService.clearUser();
      
      expect(errorReportingModule.errorReporting.setUser).toHaveBeenCalledWith(undefined);
    });
  });

  describe('addBreadcrumb', () => {
    it('should forward breadcrumb to errorReporting', () => {
      const breadcrumb = {
        message: 'User tapped button',
        category: 'user',
        level: ErrorSeverity.INFO,
      };

      crashReportingService.addBreadcrumb(breadcrumb);

      expect(errorReportingModule.errorReporting.addBreadcrumb).toHaveBeenCalledWith(breadcrumb);
    });

    it('should forward breadcrumb with data', () => {
      const breadcrumb = {
        message: 'Navigation',
        category: 'navigation',
        level: ErrorSeverity.INFO,
        data: { from: 'home', to: 'profile' },
      };

      crashReportingService.addBreadcrumb(breadcrumb);

      expect(errorReportingModule.errorReporting.addBreadcrumb).toHaveBeenCalledWith(breadcrumb);
    });

    it('should handle multiple breadcrumbs without error', () => {
      for (let i = 0; i < 150; i++) {
        crashReportingService.addBreadcrumb({
          message: `Breadcrumb ${i}`,
          category: 'test',
          level: ErrorSeverity.INFO,
        });
      }

      expect(errorReportingModule.errorReporting.addBreadcrumb).toHaveBeenCalledTimes(150);
    });
  });

  describe('captureException', () => {
    it('should forward error to errorReporting', () => {
      const error = new Error('Test error');
      
      crashReportingService.captureException(error);

      expect(errorReportingModule.errorReporting.captureException).toHaveBeenCalledWith(error, undefined);
    });

    it('should forward error with context tags', () => {
      const error = new Error('Test error');
      const context = { tags: { module: 'auth' } };
      
      crashReportingService.captureException(error, context);

      expect(errorReportingModule.errorReporting.captureException).toHaveBeenCalledWith(error, context);
    });

    it('should forward error with user context', () => {
      const error = new Error('Test error');
      const context = { user: { id: 'user123' } };
      
      crashReportingService.captureException(error, context);

      expect(errorReportingModule.errorReporting.captureException).toHaveBeenCalledWith(error, context);
    });

    it('should forward error with severity level', () => {
      const error = new Error('Test error');
      const context = { level: ErrorSeverity.ERROR };
      
      crashReportingService.captureException(error, context);

      expect(errorReportingModule.errorReporting.captureException).toHaveBeenCalledWith(error, context);
    });

    it('should forward error with fingerprint', () => {
      const error = new Error('Database connection failed');
      const context = { fingerprint: ['database-connection-error'] };
      
      crashReportingService.captureException(error, context);

      expect(errorReportingModule.errorReporting.captureException).toHaveBeenCalledWith(error, context);
    });

    it('should forward error with extra data', () => {
      const error = new Error('Payment failed');
      const context = { extra: { orderId: 'order123', amount: 100 } };
      
      crashReportingService.captureException(error, context);

      expect(errorReportingModule.errorReporting.captureException).toHaveBeenCalledWith(error, context);
    });

    it('should handle error with custom name', () => {
      const error = new Error('Custom error');
      error.name = 'CustomError';
      
      crashReportingService.captureException(error);

      expect(errorReportingModule.errorReporting.captureException).toHaveBeenCalledWith(error, undefined);
    });
  });

  describe('captureMessage', () => {
    it('should forward message to errorReporting', () => {
      crashReportingService.captureMessage('Test message');

      expect(errorReportingModule.errorReporting.captureMessage).toHaveBeenCalledWith('Test message', ErrorSeverity.ERROR, undefined);
    });

    it('should forward message with severity', () => {
      crashReportingService.captureMessage('Warning message', ErrorSeverity.WARNING);

      expect(errorReportingModule.errorReporting.captureMessage).toHaveBeenCalledWith('Warning message', ErrorSeverity.WARNING, undefined);
    });

    it('should forward message with context', () => {
      const context = { tags: { module: 'payment' } };
      crashReportingService.captureMessage('Payment processed', ErrorSeverity.INFO, context);

      expect(errorReportingModule.errorReporting.captureMessage).toHaveBeenCalledWith('Payment processed', ErrorSeverity.INFO, context);
    });
  });

  describe('ErrorSeverity', () => {
    it('should have FATAL severity', () => {
      expect(ErrorSeverity.FATAL).toBe('fatal');
    });

    it('should have ERROR severity', () => {
      expect(ErrorSeverity.ERROR).toBe('error');
    });

    it('should have WARNING severity', () => {
      expect(ErrorSeverity.WARNING).toBe('warning');
    });

    it('should have INFO severity', () => {
      expect(ErrorSeverity.INFO).toBe('info');
    });

    it('should have DEBUG severity', () => {
      expect(ErrorSeverity.DEBUG).toBe('debug');
    });
  });

  describe('Performance Tracking', () => {
    it('should return a string transaction ID', () => {
      const id = crashReportingService.startTransaction('api_call', 'http.request');

      expect(typeof id).toBe('string');
      expect(id).toMatch(/^txn_\d+_\d+$/);
    });

    it('should generate unique transaction IDs', () => {
      const id1 = crashReportingService.startTransaction('api_call');
      const id2 = crashReportingService.startTransaction('api_call');

      expect(id1).not.toBe(id2);
    });

    it('should finish transaction without error', () => {
      const id = crashReportingService.startTransaction('api_call');
      
      expect(() => crashReportingService.finishTransaction(id)).not.toThrow();
    });

    it('should handle finishing non-existent transaction', () => {
      expect(() => crashReportingService.finishTransaction('non-existent-id')).not.toThrow();
    });

    it('should accept status parameter when finishing', () => {
      const id = crashReportingService.startTransaction('api_call');
      
      expect(() => crashReportingService.finishTransaction(id, 'error')).not.toThrow();
    });
  });

  describe('setTags', () => {
    it('should forward tags to errorReporting', () => {
      const tags = { module: 'payment', version: '1.0' };
      
      crashReportingService.setTags(tags);

      expect(errorReportingModule.errorReporting.setTags).toHaveBeenCalledWith(tags);
    });

    it('should handle empty tags object', () => {
      crashReportingService.setTags({});

      expect(errorReportingModule.errorReporting.setTags).toHaveBeenCalledWith({});
    });
  });

  describe('setExtra', () => {
    it('should forward extra data to errorReporting', () => {
      crashReportingService.setExtra('orderId', 'order123');

      expect(errorReportingModule.errorReporting.setExtra).toHaveBeenCalledWith('orderId', 'order123');
    });

    it('should handle complex extra values', () => {
      const complexValue = { nested: { key: 'value' }, array: [1, 2, 3] };
      
      crashReportingService.setExtra('complexData', complexValue);

      expect(errorReportingModule.errorReporting.setExtra).toHaveBeenCalledWith('complexData', complexValue);
    });

    it('should handle numeric extra values', () => {
      crashReportingService.setExtra('retryCount', 3);

      expect(errorReportingModule.errorReporting.setExtra).toHaveBeenCalledWith('retryCount', 3);
    });
  });

  describe('User Context Persistence', () => {
    it('should persist user to AsyncStorage', async () => {
      const user = { id: 'user123', email: 'test@example.com' };

      await crashReportingService.setUser(user);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'crash_reporting_user',
        JSON.stringify(user)
      );
    });

    it('should serialize user object correctly', async () => {
      const user = {
        id: 'user456',
        email: 'user@test.com',
        phone: '+1234567890',
        username: 'testuser',
      };

      await crashReportingService.setUser(user);

      const expectedJson = JSON.stringify(user);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('crash_reporting_user', expectedJson);
    });
  });

  describe('crashReporting (shortcut API)', () => {
    it('should forward captureException through crashReporting shortcut', () => {
      const { crashReporting } = jest.requireActual('@/services/crash-reporting');
      const error = new Error('Shortcut test');
      
      crashReporting.captureException(error);

      expect(errorReportingModule.errorReporting.captureException).toHaveBeenCalledWith(error, undefined);
    });

    it('should forward captureMessage through crashReporting shortcut', () => {
      const { crashReporting } = jest.requireActual('@/services/crash-reporting');
      
      crashReporting.captureMessage('Shortcut message', ErrorSeverity.INFO);

      expect(errorReportingModule.errorReporting.captureMessage).toHaveBeenCalledWith('Shortcut message', ErrorSeverity.INFO, undefined);
    });

    it('should forward addBreadcrumb through crashReporting shortcut', () => {
      const { crashReporting } = jest.requireActual('@/services/crash-reporting');
      const breadcrumb = { message: 'Shortcut breadcrumb', category: 'test', level: ErrorSeverity.INFO };
      
      crashReporting.addBreadcrumb(breadcrumb);

      expect(errorReportingModule.errorReporting.addBreadcrumb).toHaveBeenCalledWith(breadcrumb);
    });
  });

  afterAll(async () => {
    jest.clearAllTimers();
    await new Promise(resolve => setTimeout(resolve, 0));
  });
});
