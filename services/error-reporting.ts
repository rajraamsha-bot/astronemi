/* eslint-disable no-console */
/**
 * Centralized Error & Crash Reporting Service
 */

import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

const PLACEHOLDER_DSN_PATTERNS = [
  /xxx/i,
  /your-/i,
  /placeholder/i,
  /example\.com/i,
  /dsn-here/i,
];

function isPlaceholderDsn(dsn: string): boolean {
  if (!dsn) return true;
  return PLACEHOLDER_DSN_PATTERNS.some((p) => p.test(dsn));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sentry: Record<string, any> | null = null;
let isInitialized = false;

export enum ErrorSeverity {
  FATAL = 'fatal',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug',
}

export interface ErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id?: string; email?: string; phone?: string; username?: string };
  fingerprint?: string[];
  level?: ErrorSeverity;
}

export interface Breadcrumb {
  message: string;
  category: string;
  level: ErrorSeverity | 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  data?: Record<string, unknown>;
}

const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /otp/i,
  /authorization/i,
  /bearer/i,
  /credit.?card/i,
  /cvv/i,
  /pin/i,
];

function sanitizeData(data: unknown): unknown {
  if (typeof data === 'string') {
    if (SENSITIVE_PATTERNS.some((p) => p.test(data))) return '[REDACTED]';
    return data;
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      sanitized[key] = SENSITIVE_PATTERNS.some((p) => p.test(key))
        ? '[REDACTED]'
        : sanitizeData(value);
    }
    return sanitized;
  }
  return data;
}

class ErrorReportingService {
  private appState: AppStateStatus = AppState.currentState;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private userContext: ErrorContext['user'] | undefined;
  private errorCount = 0;
  private lastErrorRateCheck = Date.now();
  private readonly ERROR_RATE_WINDOW_MS = 60000;
  private readonly ERROR_RATE_THRESHOLD = 5;

  async init(): Promise<void> {
    await this.initialize();
  }

  async initialize(): Promise<void> {
    if (isInitialized) return;
    if (!SENTRY_DSN || isPlaceholderDsn(SENTRY_DSN)) {
      const msg =
        '[ErrorReporting] Sentry DSN is not configured or is a placeholder — crash reporting is DISABLED';
      if (__DEV__) console.warn(msg);
      else console.error(msg);
      return;
    }
    try {
      const SentryModule = await import('@sentry/react-native');
      Sentry = SentryModule as Record<string, any>;
      // MED-4 fix: release = "app@version+dist" so Sentry can
      // distinguish builds from releases.
      const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0';
      const BUILD_NUMBER = process.env.EXPO_PUBLIC_BUILD_NUMBER || '1';
      Sentry.init!({
        dsn: SENTRY_DSN,
        environment: __DEV__ ? 'development' : 'production',
        release: 'astronemi@' + APP_VERSION,
        dist: BUILD_NUMBER,
        enableAutoSessionTracking: true,
        tracesSampleRate: __DEV__ ? 1.0 : 0.2,
        profilesSampleRate: __DEV__ ? 0.5 : 0.1,
        attachStacktrace: true,
        debug: __DEV__,
        maxBreadcrumbs: 100,
        sendDefaultPii: false,
        beforeBreadcrumb: (breadcrumb: Record<string, unknown>) => {
          if (
            !__DEV__ &&
            breadcrumb.category === 'console' &&
            breadcrumb.level === 'debug'
          ) {
            return null;
          }
          if (
            (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') &&
            breadcrumb.data
          ) {
            const data = breadcrumb.data as Record<string, unknown>;
            if (data.request_headers) {
              delete data.request_headers;
            }
          }
          return breadcrumb;
        },
      });
      this.appStateSubscription = AppState.addEventListener(
        'change',
        this.handleAppStateChange,
      );
      await this.loadUserContext();
      this.addBreadcrumb({
        message: 'App started',
        category: 'app',
        level: ErrorSeverity.INFO,
      });
      isInitialized = true;
    } catch (error) {
      console.error('[ErrorReporting] Failed to initialize:', error);
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (this.appState !== nextAppState) {
      this.addBreadcrumb({
        message: `App state changed: ${nextAppState}`,
        category: 'app',
        level: ErrorSeverity.INFO,
        data: { previousState: this.appState },
      });
      this.appState = nextAppState;
    }
  };

  private async loadUserContext(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('@astrofusion_error_user');
      if (stored) {
        this.userContext = JSON.parse(stored);
        this.setUser(this.userContext);
      }
    } catch {
      /* ignore */
    }
  }

  setUser(user: ErrorContext['user'] | undefined): void {
    this.userContext = user;
    if (!Sentry || !isInitialized) return;
    if (user) {
      Sentry.setUser!({
        id: user.id,
        email: user.email,
        username: user.username || user.phone,
      });
      AsyncStorage.setItem(
        '@astrofusion_error_user',
        JSON.stringify(user),
      ).catch(() => {});
    } else {
      Sentry.setUser!(null);
      AsyncStorage.removeItem('@astrofusion_error_user').catch(() => {});
    }
  }

  setTags(tags: Record<string, string>): void {
    if (!Sentry || !isInitialized) return;
    Object.entries(tags).forEach(([key, value]) => Sentry!.setTag!(key, value));
  }

  setExtra(key: string, value: unknown): void {
    if (!Sentry || !isInitialized) return;
    Sentry.setExtra!(key, value);
  }

  captureException(error: Error, context?: ErrorContext): void {
    this.errorCount++;
    this.checkErrorRate();
    this.addBreadcrumb({
      message: `Exception: ${error.message}`,
      category: 'error',
      level: ErrorSeverity.ERROR,
      data: { name: error.name, stack: error.stack?.substring(0, 500) },
    });
    if (!Sentry || !isInitialized) {
      console.error('[ErrorReporting]', error);
      return;
    }
    Sentry.captureException!(error, {
      tags: context?.tags,
      extra: context?.extra ? sanitizeData(context.extra) : undefined,
      user: context?.user || this.userContext,
      fingerprint: context?.fingerprint,
      level: context?.level || 'error',
    });
  }

  captureMessage(
    message: string,
    level: ErrorSeverity = ErrorSeverity.ERROR,
    context?: ErrorContext,
  ): void {
    if (!Sentry || !isInitialized) {
      console.log(`[ErrorReporting][${level}]`, message);
      return;
    }
    Sentry.captureMessage!(message, {
      level,
      tags: context?.tags,
      extra: context?.extra ? sanitizeData(context.extra) : undefined,
    });
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    if (!Sentry || !isInitialized) return;
    Sentry.addBreadcrumb!({
      message: breadcrumb.message,
      category: breadcrumb.category,
      level: breadcrumb.level as string,
      data: breadcrumb.data ? sanitizeData(breadcrumb.data) : undefined,
    });
  }

  trackNavigation(from: string, to: string): void {
    this.addBreadcrumb({
      message: `${from} -> ${to}`,
      category: 'navigation',
      level: ErrorSeverity.INFO,
    });
  }

  trackAction(action: string, data?: Record<string, unknown>): void {
    this.addBreadcrumb({
      message: `Action: ${action}`,
      category: 'user',
      level: ErrorSeverity.INFO,
      data,
    });
  }

  trackApiCall(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
  ): void {
    this.addBreadcrumb({
      message: `API: ${method} ${endpoint}`,
      category: 'api',
      level: statusCode >= 400 ? ErrorSeverity.WARNING : ErrorSeverity.INFO,
      data: {
        method,
        endpoint,
        duration_ms: duration,
        status_code: statusCode,
      },
    });
  }

  private checkErrorRate(): void {
    const now = Date.now();
    const elapsed = now - this.lastErrorRateCheck;
    if (elapsed >= this.ERROR_RATE_WINDOW_MS) {
      // Compute errors-per-second over the window. The previous formula
      // divided errorCount by the window length in ms (then ×100), so the
      // threshold of 5 required >3000 errors in 60s — effectively
      // unreachable. Compare against errors/second instead so the
      // threshold (5 errors/sec) is meaningful.
      const errorsPerSecond = this.errorCount / (elapsed / 1000);
      if (errorsPerSecond > this.ERROR_RATE_THRESHOLD) {
        this.captureMessage(
          `High error rate: ${errorsPerSecond.toFixed(2)} errors/sec`,
          ErrorSeverity.FATAL,
        );
      }
      this.errorCount = 0;
      this.lastErrorRateCheck = now;
    }
  }

  startTransaction(name: string, op?: string): unknown {
    if (!Sentry || !isInitialized) return null;
    return Sentry!.startTransaction!({ name, op: op || name });
  }

  destroy(): void {
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    isInitialized = false;
  }

  test(): void {
    if (!Sentry || !isInitialized) {
      console.error('[ErrorReporting] Not initialized');
      return;
    }
    this.addBreadcrumb({
      message: 'Sentry test breadcrumb',
      category: 'test',
      level: ErrorSeverity.INFO,
    });
    this.captureMessage('Sentry test message', ErrorSeverity.INFO, {
      tags: { test: 'true' },
    });
    try {
      throw new Error('Sentry test exception');
    } catch (error) {
      this.captureException(error as Error, {
        tags: { test: 'true' },
        level: ErrorSeverity.WARNING,
      });
    }
    console.log('[ErrorReporting] Test complete. Check Sentry dashboard.');
  }
}

export const errorReporting = new ErrorReportingService();
export default errorReporting;