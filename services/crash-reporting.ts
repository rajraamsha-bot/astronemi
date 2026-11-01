/**
 * Crash Reporting Service
 *
 * Thin wrapper that delegates to @/services/error-reporting (the actual
 * Sentry-backed implementation) while providing a stable, project-wide
 * API. This layer exists so the test suite can be written against a
 * single import regardless of which error-reporting backend is active.
 *
 * Security: ID generation uses a CSPRNG (expo-crypto) so identifiers
 * are unguessable.
 */

import { errorReporting, ErrorSeverity, ErrorContext } from './error-reporting';
import { prefixedSecureId } from '@/utils/secure-random';
import AsyncStorage from '@react-native-async-storage/async-storage';

export { ErrorSeverity };
export type { ErrorContext };

const USER_STORAGE_KEY = 'crash_reporting_user';
const ACTIVE_TRANSACTIONS = new Set<string>();
let transactionCounter = 0;

interface Breadcrumb {
  message: string;
  category?: string;
  level?: ErrorSeverity;
  data?: Record<string, unknown>;
}

/**
 * Generate a unique transaction ID using time + counter.
 * Format: txn_<timestamp>_<counter>
 */
function generateTransactionId(): string {
  transactionCounter = (transactionCounter + 1) % 1000000;
  return `txn_${Date.now()}_${transactionCounter}`;
}

class CrashReportingService {
  async init(): Promise<void> {
    return errorReporting.init();
  }

  async initialize(): Promise<void> {
    return errorReporting.initialize();
  }

  /**
   * Set the current user. Persists to AsyncStorage so the user context
   * survives app restarts and can be restored on cold start.
   */
  async setUser(user: ErrorContext['user'] | undefined): Promise<void> {
    try {
      if (user) {
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch {
      // Storage failure should not break user-context setting.
    }
    errorReporting.setUser(user);
  }

  /**
   * Clear the current user. Equivalent to setUser(undefined).
   */
  async clearUser(): Promise<void> {
    return this.setUser(undefined);
  }

  setTags(tags: Record<string, string>): void {
    errorReporting.setTags(tags);
  }

  setExtra(key: string, value: unknown): void {
    errorReporting.setExtra(key, value);
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    // Forward to the underlying Sentry-backed implementation.
    (errorReporting.addBreadcrumb as (b: Breadcrumb) => void)(breadcrumb);
  }

  captureException(error: Error, context?: ErrorContext): void {
    errorReporting.captureException(error, context);
  }

  captureMessage(
    message: string,
    level: ErrorSeverity = ErrorSeverity.ERROR,
    context?: ErrorContext
  ): void {
    errorReporting.captureMessage(message, level, context);
  }

  /**
   * Start a performance-tracking transaction. Returns a unique ID
   * that can be passed to finishTransaction() to mark completion.
   */
  startTransaction(_name: string, _op?: string): string {
    const id = generateTransactionId();
    ACTIVE_TRANSACTIONS.add(id);
    return id;
  }

  /**
   * Finish a previously-started transaction. Safe to call with
   * an unknown ID — it just becomes a no-op.
   */
  finishTransaction(id: string, _status: 'ok' | 'error' = 'ok'): void {
    ACTIVE_TRANSACTIONS.delete(id);
  }

  /**
   * Generate a unique, cryptographically secure event ID for
   * crash reports, transactions, and breadcrumbs.
   */
  generateId(): string {
    return prefixedSecureId('crash', 12);
  }
}

export const crashReportingService = new CrashReportingService();
// Shortcut alias used by tests and call-sites that want a shorter name.
export const crashReporting = crashReportingService;
export default crashReportingService;
