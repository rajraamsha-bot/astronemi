/* eslint-disable no-console */
/**
 * Production Logger Service - React Native Best Practices
 * 
 * Structured logging that routes through Sentry in production
 * and to console in development. Replaces direct console.log usage.
 * 
 * Usage:
 *   import { Logger } from '@/services/logger';
 *   Logger.info('Payment processed', { orderId, amount });
 *   Logger.error('Payment failed', error, { userId });
 *   Logger.warn('Deprecated API called', { endpoint });
 */

import { errorReporting, ErrorSeverity } from './error-reporting';

const IS_DEV = __DEV__;

export const Logger = {
  debug(message: string, context?: unknown): void {
    if (IS_DEV) {
      console.debug(`[DEBUG] ${message}`, context || '');
    }
  },

  info(message: string, context?: unknown): void {
    if (IS_DEV) {
      console.log(`[INFO] ${message}`, context || '');
    } else {
      errorReporting.addBreadcrumb({
        message,
        category: 'info',
        level: ErrorSeverity.INFO,
        data: (context as Record<string, string>) || {},
      });
    }
  },

  warn(message: string, context?: unknown): void {
    if (IS_DEV) {
      console.warn(`[WARN] ${message}`, context || '');
    } else {
      errorReporting.addBreadcrumb({
        message,
        category: 'warning',
        level: ErrorSeverity.WARNING,
        data: (context as Record<string, string>) || {},
      });
    }
  },

  error(message: string, error?: Error | unknown, context?: unknown): void {
    if (IS_DEV) {
      console.error(`[ERROR] ${message}`, error, context || '');
    }

    if (error instanceof Error) {
      errorReporting.captureException(error, {
        extra: { message, ...(context as Record<string, string>) },
      });
    } else {
      errorReporting.captureMessage(message as string, ErrorSeverity.ERROR);
    }
  },

  action(action: string, data?: Record<string, string>): void {
    errorReporting.addBreadcrumb({
      message: action,
      category: 'user_action',
      level: ErrorSeverity.INFO,
      data,
    });
  },

  navigation(from: string, to: string): void {
    errorReporting.addBreadcrumb({
      message: `${from} → ${to}`,
      category: 'navigation',
      level: ErrorSeverity.INFO,
    });
  },
};

export default Logger;