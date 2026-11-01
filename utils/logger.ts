/**
 * Logger Utility (Canonical Wrapper)
 *
 * This file is the canonical entry point for app logging. It re-exports
 * the production-grade logger from `@/services/logger`, which routes
 * through Sentry in production and the console in development.
 *
 * Historical note: an older, simpler `utils/logger.ts` lived here that
 * duplicated the Sentry breadcrumb logic. The current implementation
 * delegates to the unified `@/services/logger` so there is a single
 * source of truth.
 *
 * Usage:
 *   import { Logger } from '@/utils/logger';
 *   Logger.info('Payment processed', { orderId, amount });
 *   Logger.error('Payment failed', error, { userId });
 *   Logger.warn('Deprecated API called', { endpoint });
 */

export { Logger } from '@/services/logger';
export { Logger as default } from '@/services/logger';
