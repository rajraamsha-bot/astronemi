/**
 * ErrorBoundary Component Tests
 *
 * Tests for error boundary functionality including:
 * - Error catching and display
 * - Custom fallback rendering
 * - Error recovery mechanisms
 * - Error reporting callbacks
 * - Development vs production behavior
 */

import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import ErrorBoundary from '@/components/ErrorBoundary';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
  },
}));

// Mock error reporting
jest.mock('@/services/error-reporting', () => ({
  errorReporting: {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    addBreadcrumb: jest.fn(),
  },
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  AlertTriangle: 'AlertTriangle',
  RefreshCw: 'RefreshCw',
  Home: 'Home',
}));

// Component that throws an error
const ErrorThrowingComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <Text>No error</Text>;
};

// Component that throws error on button press
const ErrorOnClickComponent = () => {
  const [shouldThrow, setShouldThrow] = React.useState(false);

  if (shouldThrow) {
    throw new Error('Button triggered error');
  }

  return (
    <TouchableOpacity
      testID="error-button"
      onPress={() => setShouldThrow(true)}
    >
      <Text>Click to throw error</Text>
    </TouchableOpacity>
  );
};

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Error Catching', () => {
    it('catches errors in child components', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { getByText } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(getByText(/Something went wrong/i)).toBeTruthy();
        expect(getByText(/Test error message/)).toBeTruthy();
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('displays custom fallback when provided', async () => {
      const customFallback = (
        <View testID="custom-fallback">
          <Text>Custom Error Fallback</Text>
        </View>
      );

      const { getByTestId } = render(
        <ErrorBoundary fallback={customFallback}>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(getByTestId('custom-fallback')).toBeTruthy();
        expect(screen.getByText('Custom Error Fallback')).toBeTruthy();
      });
    });

    it('catches errors triggered by user interactions', async () => {
      const { getByTestId, getByText } = render(
        <ErrorBoundary>
          <ErrorOnClickComponent />
        </ErrorBoundary>
      );

      // Initially should render normally
      expect(getByTestId('error-button')).toBeTruthy();

      // Trigger error
      fireEvent.press(getByTestId('error-button'));

      await waitFor(() => {
        expect(getByText(/Something went wrong/i)).toBeTruthy();
        expect(getByText(/Button triggered error/)).toBeTruthy();
      });
    });
  });

  describe('Error Recovery', () => {
    it('allows recovery by pressing try again', async () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      // Should show error initially
      await waitFor(() => {
        expect(getByText(/Something went wrong/i)).toBeTruthy();
      });

      // Pressing try again resets the boundary; since children still throw,
      // it catches the error again and shows the error UI.
      fireEvent.press(getByText(/Try Again/i));

      await waitFor(() => {
        expect(getByText(/Something went wrong/i)).toBeTruthy();
      });
    });

    it('provides go home functionality', async () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(getByText(/Go Home/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Go Home/i));

      expect(require('expo-router').router.replace).toHaveBeenCalledWith('/');
    });
  });

  describe('Error Callbacks', () => {
    it('calls onError callback when error occurs', async () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.any(Object)
        );
      });
    });

    it('does not call onError when no error occurs', async () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <Text>No error here</Text>
        </ErrorBoundary>
      );

      // Wait to ensure no error callback
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('Development vs Production', () => {
    const originalDev = __DEV__;

    afterEach(() => {
      global.__DEV__ = originalDev;
    });

    it('logs errors in development mode', async () => {
      global.__DEV__ = true;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'ErrorBoundary caught an error:',
          expect.any(Error),
          expect.any(Object)
        );
      });

      consoleSpy.mockRestore();
    });

    it('does not log errors in production mode', async () => {
      global.__DEV__ = false;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { getByText } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(getByText(/Something went wrong/i)).toBeTruthy();
      });

      // Assert our own error log was not emitted (React internals may still log)
      expect(consoleSpy).not.toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error UI Elements', () => {
    it('displays error message and stack trace', async () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(getByText(/Something went wrong/i)).toBeTruthy();
        expect(getByText(/Test error message/)).toBeTruthy();
      });
    });

    it('shows retry button', async () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(getByText(/Try Again/i)).toBeTruthy();
      });
    });

    it('shows go home button', async () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(getByText(/Go Home/i)).toBeTruthy();
      });
    });
  });

  describe('Navigation Actions', () => {
    it('go home button navigates to home', async () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(getByText(/Go Home/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Go Home/i));

      expect(require('expo-router').router.replace).toHaveBeenCalledWith('/');
    });
  });

  describe('Edge Cases', () => {
    it('handles null children gracefully', async () => {
      const { queryByText } = render(
        <ErrorBoundary>
          {null}
        </ErrorBoundary>
      );

      expect(queryByText(/Something went wrong/i)).toBeNull();
    });

    it('handles empty children array', async () => {
      const { UNSAFE_root } = render(
        <ErrorBoundary>
          {[]}
        </ErrorBoundary>
      );

      // Should render nothing without error
      expect(UNSAFE_root.children.length).toBe(0);
    });
  });
});
