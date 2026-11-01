/**
 * Environment Validation Service
 * 
 * Validates required environment variables at app startup
 */

import { Logger } from './logger';

export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EnvConfig {
  key: string;
  required: boolean;
  isUrl?: boolean;
  minLength?: number;
  pattern?: RegExp;
  customValidator?: (value: string) => boolean;
}

const REQUIRED_CONFIGS: EnvConfig[] = [
  {
    key: 'EXPO_PUBLIC_SUPABASE_URL',
    required: true,
    isUrl: true,
  },
  {
    key: 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    minLength: 10,
  },
  {
    key: 'EXPO_PUBLIC_RAZORPAY_KEY_ID',
    required: true,
    // Real keys are `rzp_live_...` or `rzp_test_...` followed by 14+
    // alphanumeric chars. Anything else (placeholder, blank, garbage) is
    // rejected at startup instead of failing at payment time.
    // NOTE: in production builds only `rzp_live_` is accepted; see
    // `customValidator`.
    pattern: /^rzp_(live|test)_[A-Za-z0-9]{10,}$/,
    customValidator: (value: string) => {
      // Block obvious placeholders even if they happen to match the pattern.
      if (
        value.includes('CONFIGURE') ||
        value.includes('REPLACE') ||
        value.includes('YOUR_KEY') ||
        value.includes('dummy')
      ) {
        return false;
      }
      // Outside dev, only live keys are acceptable (a test key in prod is a
      // silent revenue loss because every payment silently 4xx's).
      if (process.env.NODE_ENV === 'production' && !value.startsWith('rzp_live_')) {
        return false;
      }
      return true;
    },
  },
];

const OPTIONAL_CONFIGS: EnvConfig[] = [
  {
    key: 'EXPO_PUBLIC_AGORA_APP_ID',
    required: false,
    minLength: 5,
  },
  {
    key: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    required: false,
  },
  {
    key: 'EXPO_PUBLIC_SENTRY_DSN',
    required: false,
    isUrl: true,
  },
  {
    key: 'EXPO_PUBLIC_MIXPANEL_TOKEN',
    required: false,
    minLength: 5,
  },
  {
    key: 'EXPO_PUBLIC_COUNTRY_CODE',
    required: false,
    pattern: /^\+\d{1,3}$/,
  },
];

/**
 * Static mapping of known env variables.
 * Expo requires static references to EXPO_PUBLIC_ variables for bundling,
 * but `process.env` at runtime also includes anything injected by the build
 * pipeline. We try the static map first, then fall back to `process.env` so
 * feature flags (EXPO_PUBLIC_ENABLE_*) and any other dynamically-provided
 * variables still work.
 */
const FEATURE_FLAG_PREFIX = 'EXPO_PUBLIC_ENABLE_';

function getEnvValue(key: string): string | undefined {
  switch (key) {
    case 'EXPO_PUBLIC_SUPABASE_URL': return process.env.EXPO_PUBLIC_SUPABASE_URL;
    case 'EXPO_PUBLIC_SUPABASE_ANON_KEY': return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    case 'EXPO_PUBLIC_RAZORPAY_KEY_ID': return process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;
    case 'EXPO_PUBLIC_AGORA_APP_ID': return process.env.EXPO_PUBLIC_AGORA_APP_ID;
    case 'EXPO_PUBLIC_FIREBASE_PROJECT_ID': return process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
    case 'EXPO_PUBLIC_SENTRY_DSN': return process.env.EXPO_PUBLIC_SENTRY_DSN;
    case 'EXPO_PUBLIC_MIXPANEL_TOKEN': return process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;
    case 'EXPO_PUBLIC_COUNTRY_CODE': return process.env.EXPO_PUBLIC_COUNTRY_CODE;
    case 'EXPO_PUBLIC_APP_ENV': return process.env.EXPO_PUBLIC_APP_ENV;
    case 'EXPO_PUBLIC_DEBUG_MODE': return process.env.EXPO_PUBLIC_DEBUG_MODE;
    case 'EXPO_PUBLIC_USE_MOCK_API': return process.env.EXPO_PUBLIC_USE_MOCK_API;
    default:
      // Feature flag and any other dynamic env var — fall back to process.env.
      if (key.startsWith(FEATURE_FLAG_PREFIX)) {
        return process.env[key];
      }
      return process.env[key];
  }
}

class EnvironmentValidationService {
  private validationResults: Map<string, EnvValidationResult> = new Map();

  /**
   * Validate all environment variables
   */
  validateAll(): EnvValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    // Check required configs
    for (const config of REQUIRED_CONFIGS) {
      const result = this.validateConfig(config);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    // Check optional configs and add warnings for missing ones
    for (const config of OPTIONAL_CONFIGS) {
      const result = this.validateConfig(config);
      if (result.errors.length > 0) {
        allErrors.push(...result.errors);
      }
    }

    const isValid = allErrors.length === 0;

    const finalResult: EnvValidationResult = {
      isValid,
      errors: allErrors,
      warnings: allWarnings,
    };

    // Cache result
    this.validationResults.set('all', finalResult);

    // Log results
    if (!isValid) {
      Logger.error('Environment validation failed', undefined, {
        errors: allErrors.join(', '),
      });
    } else if (allWarnings.length > 0) {
      Logger.warn('Environment validation warnings', {
        warnings: allWarnings.join(', '),
      });
    } else {
      Logger.info('Environment validation passed');
    }

    return finalResult;
  }

  /**
   * Validate a single configuration
   */
  validateConfig(config: EnvConfig): EnvValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get value from environment using static mapping
    const value = getEnvValue(config.key);

    // Check if required and missing
    if (config.required && !value) {
      errors.push(`${config.key} is required but not set`);
      return { isValid: false, errors, warnings };
    }

    // Skip further validation if optional and not set
    if (!value) {
      warnings.push(`${config.key} is not set (optional)`);
      return { isValid: true, errors, warnings };
    }

    // Validate URL format
    if (config.isUrl) {
      try {
        new URL(value);
      } catch {
        errors.push(`${config.key} must be a valid URL`);
      }
    }

    // Validate minimum length
    if (config.minLength && value.length < config.minLength) {
      errors.push(`${config.key} must be at least ${config.minLength} characters`);
    }

    // Validate pattern
    if (config.pattern && !config.pattern.test(value)) {
      errors.push(`${config.key} format is invalid`);
    }

    // Custom validator
    if (config.customValidator && !config.customValidator(value)) {
      errors.push(`${config.key} failed custom validation`);
    }

    // Check for common placeholder patterns. In production, placeholders
    // on required keys become hard errors so we don't ship fake credentials.
    const looksLikePlaceholder =
      /your-|xxx|placeholder|demo_|abcdef1234567890|12345678901234567890/i.test(value) ||
      (config.key === 'EXPO_PUBLIC_RAZORPAY_KEY_ID' && /^rzp_(live|test)_(x{3,}|1234567890)/i.test(value));

    if (looksLikePlaceholder) {
      const isProd = process.env.EXPO_PUBLIC_APP_ENV === 'production';
      const msg = `${config.key} appears to be a placeholder value`;
      if (isProd && config.required) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
    }

    // Test-mode Razorpay keys are fine outside production, but never in prod
    if (
      config.key === 'EXPO_PUBLIC_RAZORPAY_KEY_ID' &&
      value.startsWith('rzp_test_') &&
      process.env.EXPO_PUBLIC_APP_ENV === 'production'
    ) {
      errors.push('EXPO_PUBLIC_RAZORPAY_KEY_ID is a test key but APP_ENV is production');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get specific config value with fallback
   */
  getConfig(key: string, fallback: string = ''): string {
    return getEnvValue(key) || fallback;
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: string): boolean {
    // For feature flags, we use a static check approach
    const key = `EXPO_PUBLIC_ENABLE_${feature.toUpperCase()}`;
    return getEnvValue(key) === 'true';
  }

  /**
   * Get app environment
   */
  getAppEnvironment(): 'development' | 'staging' | 'production' {
    const env = process.env.EXPO_PUBLIC_APP_ENV;
    if (env === 'production') return 'production';
    if (env === 'staging') return 'staging';
    return 'development';
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.getAppEnvironment() === 'production';
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugMode(): boolean {
    return process.env.EXPO_PUBLIC_DEBUG_MODE === 'true';
  }

  /**
   * Get cached validation result
   */
  getCachedResult(): EnvValidationResult | null {
    return this.validationResults.get('all') || null;
  }
}

export const envValidation = new EnvironmentValidationService();

export default envValidation;