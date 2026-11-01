/**
 * Rate Limiter Service
 *
 * Client-side rate limiting using AsyncStorage for persistence.
 * Tracks request counts per type+identifier within sliding time windows.
 *
 * Usage:
 *   const result = await RateLimiter.isAllowed('api');
 *   if (!result.allowed) { ... }
 *
 *   await RateLimiter.recordAttempt('otp_request', phone);
 *
 *   const check = await RateLimiter.checkRateLimit('payment', userId);
 *   if (check.isLimited) { ... }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RecordAttemptResult {
  blocked: boolean;
  remainingMs?: number;
}

export interface CheckRateLimitResult {
  isLimited: boolean;
}

// ─── Rate Limit Config ────────────────────────────────────────────────────────

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  api: { maxAttempts: 100, windowMs: 60_000 },
  chat: { maxAttempts: 30, windowMs: 60_000 },
  auth: { maxAttempts: 5, windowMs: 60_000 },
  otp_request: { maxAttempts: 5, windowMs: 60_000 },
  otp_verify: { maxAttempts: 5, windowMs: 60_000 },
  payment: { maxAttempts: 10, windowMs: 60_000 },
};

const DEFAULT_CONFIG: RateLimitConfig = { maxAttempts: Infinity, windowMs: 60_000 };

const STORAGE_KEY_PREFIX = 'rate_limit_';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getConfig(type: string): RateLimitConfig {
  return RATE_LIMITS[type] ?? DEFAULT_CONFIG;
}

function storageKey(type: string, identifier?: string): string {
  return `${STORAGE_KEY_PREFIX}${type}${identifier ? `_${identifier}` : ''}`;
}

interface StoredAttemptData {
  count: number;
  windowStart: number;
  blockedUntil?: number;
}

async function readData(key: string, windowMs: number): Promise<StoredAttemptData> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredAttemptData;
      // If the window has expired, reset
      if (Date.now() - parsed.windowStart >= windowMs) {
        return { count: 0, windowStart: Date.now() };
      }
      return parsed;
    }
  } catch {
    // Ignore read errors
  }
  return { count: 0, windowStart: Date.now() };
}

async function writeData(key: string, data: StoredAttemptData): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore write errors
  }
}

// ─── RateLimiter ──────────────────────────────────────────────────────────────

// ─── Atomic check-and-record lock ─────────────────────────────────────────────
// `checkRateLimit` + `recordAttempt` are separate AsyncStorage read-modify-write
// steps. Without serialising them, `wrap`/`RateLimited` could let N concurrent
// callers all observe the same `count < max` and collectively exceed the limit
// (a TOCTOU race). The per-key promise-chain lock below makes each
// check-then-increment atomic per (type, identifier) and self-cleans.
const keyLocks = new Map<string, Promise<void>>();

async function withKeyLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = keyLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const next = prev.then(() => gate);
  keyLocks.set(key, next);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    // Only evict the lock entry if it is still ours (a newer caller would have
    // replaced it, and we must not clear their slot).
    if (keyLocks.get(key) === next) {
      keyLocks.delete(key);
    }
  }
}

export const RateLimiter = {
  /**
   * Check whether a request of the given type is allowed.
   * Does NOT record an attempt – call `recordAttempt` separately.
   */
  async isAllowed(type: string, identifier?: string): Promise<RateLimitResult> {
    const config = getConfig(type);
    const key = storageKey(type, identifier);
    const data = await readData(key, config.windowMs);

    // `remaining` counts the request being checked as consumed, i.e. it is the
    // number of attempts left *after* this one.
    const remaining = config.maxAttempts === Infinity
      ? -1
      : Math.max(0, config.maxAttempts - data.count - 1);

    const resetAt = data.windowStart + config.windowMs;

    return {
      allowed: data.count < config.maxAttempts,
      remaining,
      resetAt,
    };
  },

  /**
   * Record a rate-limit attempt. Returns whether the caller is now blocked.
   */
  async recordAttempt(type: string, identifier?: string): Promise<RecordAttemptResult> {
    const config = getConfig(type);
    const key = storageKey(type, identifier);
    const data = await readData(key, config.windowMs);

    data.count += 1;

    if (data.count > config.maxAttempts) {
      const remainingMs = data.windowStart + config.windowMs - Date.now();
      data.blockedUntil = data.windowStart + config.windowMs;
      await writeData(key, data);
      return { blocked: true, remainingMs: Math.max(0, remainingMs) };
    }

    await writeData(key, data);
    return { blocked: false };
  },

  /**
   * Convenience used by auth-service and wallet.
   * Combines `isAllowed` + returns an `isLimited` flag.
   */
  async checkRateLimit(type: string, identifier?: string): Promise<CheckRateLimitResult> {
    const result = await this.isAllowed(type, identifier);
    return { isLimited: !result.allowed };
  },

  /**
   * Atomically check-and-record an attempt for `type`/`identifier`.
   * Serialises the read-modify-write so concurrent callers cannot all pass a
   * `count < max` check at the same time (fixes the TOCTOU gap in `wrap` and
   * `RateLimited`). Returns whether the caller is allowed to proceed.
   */
  async checkAndRecord(
    type: string,
    identifier?: string
  ): Promise<{ allowed: boolean }> {
    const key = storageKey(type, identifier);
    return withKeyLock(key, async () => {
      const result = await this.isAllowed(type, identifier);
      if (!result.allowed) {
        return { allowed: false };
      }
      await this.recordAttempt(type, identifier);
      return { allowed: true };
    });
  },

  /**
   * Reset the rate limit for a specific type (+ optional identifier).
   */
  async reset(type: string, identifier?: string): Promise<void> {
    const key = storageKey(type, identifier);
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },

  /**
   * Reset all rate-limit keys in AsyncStorage.
   */
  async resetAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys?.();
      if (keys) {
        const rateLimitKeys = keys.filter((k: string) => k.startsWith(STORAGE_KEY_PREFIX));
        if (rateLimitKeys.length > 0) {
          await AsyncStorage.multiRemove(rateLimitKeys);
        }
      }
    } catch {
      // Ignore
    }
  },

  /**
   * Milliseconds until the current rate-limit window resets.
   * Returns 0 if no active limit.
   */
  async getTimeUntilReset(type: string, identifier?: string): Promise<number> {
    const config = getConfig(type);
    const key = storageKey(type, identifier);
    const data = await readData(key, config.windowMs);

    // Return remaining window time whenever there are active attempts
    if (data.count === 0) return 0;

    const remaining = data.windowStart + config.windowMs - Date.now();
    return Math.max(0, remaining);
  },

  /**
   * Human-readable time until reset (e.g. "45s", "2m", "1h").
   */
  async getFormattedTimeUntilReset(type: string, identifier?: string): Promise<string> {
    const ms = await this.getTimeUntilReset(type, identifier);
    if (ms <= 0) return '0s';

    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.ceil(minutes / 60);
    return `${hours}h`;
  },

  /**
   * Wrap an async function so it throws when rate-limited.
   */
  wrap<T>(
    type: string,
    fn: () => Promise<T>,
    identifier?: string,
  ): () => Promise<T> {
    return async () => {
      const { allowed } = await this.checkAndRecord(type, identifier);
      if (!allowed) {
        throw new Error('Rate limit exceeded');
      }
      return fn();
    };
  },
};

/**
 * Decorator-style rate limiter.
 *
 * Usage:
 *   const safeFn = RateLimited('api')(myFn);
 *   await safeFn();
 */
export function RateLimited(type: string, identifier?: string) {
  return <T extends (...args: unknown[]) => unknown>(fn: T): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const { allowed } = await RateLimiter.checkAndRecord(type, identifier);
      if (!allowed) {
        throw new Error('Rate limit exceeded');
      }
      return fn(...args) as ReturnType<T>;
    };
  };
}

export default RateLimiter;