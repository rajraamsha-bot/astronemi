/**
 * Production Environment Validation Script
 * 
 * This script validates that the app is properly configured for production
 * before building. It will fail the build if critical issues are found.
 */

const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Load environment variables
function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return env;
  } catch (error) {
    return null;
  }
}

// Check if value looks like a placeholder
function isPlaceholder(value) {
  if (!value) return true;
  
  const placeholderPatterns = [
    /your-|xxx|placeholder|demo_|configure_|replace_with|abcdef1234567890|12345678901234567890/i,
    /^rzp_(live|test)_(x{3,}|1234567890)/i,
  ];
  
  return placeholderPatterns.some(pattern => pattern.test(value));
}

// Main validation function
function validateProductionEnvironment() {
  logInfo('Starting production environment validation...');
  
  const envPath = path.join(__dirname, '..', '.env');
  const prodEnvPath = path.join(__dirname, '..', '.env.production');
  const envFromFile = loadEnvFile(envPath);
  const envFromProduction = loadEnvFile(prodEnvPath);

  // Expo/EAS builds load .env.production for NODE_ENV=production, so validate
  // the same file. Precedence: real process env (CI secrets) > .env.production
  // > .env. Previously only .env was read, which meant a clean .env.production
  // could still hide a mock flag or placeholder from this gate.
  const env = { ...envFromFile, ...envFromProduction, ...process.env };

  if (!envFromFile && !envFromProduction && !process.env.EXPO_PUBLIC_SUPABASE_URL) {
    logError(
      `Environment file not found: ${envPath}/.env.production ` +
      '(and no EXPO_PUBLIC_* env vars provided)'
    );
    process.exit(1);
  }
  
  let hasErrors = false;
  let hasWarnings = false;
  
  // Required production environment variables
  const requiredVars = {
    EXPO_PUBLIC_SUPABASE_URL: 'Supabase URL',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'Supabase Anon Key',
    EXPO_PUBLIC_RAZORPAY_KEY_ID: 'Razorpay Key ID',
  };
  
  logInfo('Checking required environment variables...');
  
  for (const [key, description] of Object.entries(requiredVars)) {
    const value = env[key];
    
    if (!value) {
      logError(`${key} is required but not set`);
      hasErrors = true;
    } else if (isPlaceholder(value)) {
      logError(`${key} appears to be a placeholder value`);
      hasErrors = true;
    } else {
      logSuccess(`${key} is properly configured`);
    }
  }
  
  // Check for test keys in production
  logInfo('Checking for test keys in production...');
  
  const razorpayKey = env.EXPO_PUBLIC_RAZORPAY_KEY_ID;
  if (razorpayKey && razorpayKey.startsWith('rzp_test_')) {
    logError('EXPO_PUBLIC_RAZORPAY_KEY_ID is a test key but APP_ENV is production');
    hasErrors = true;
  }
  
  // Check APP_ENV
  logInfo('Checking APP_ENV configuration...');

  const appEnv = env.EXPO_PUBLIC_APP_ENV || 'development';
  if (appEnv !== 'production') {
    logError(`EXPO_PUBLIC_APP_ENV is set to "${appEnv}" but must be "production" for production builds`);
    hasErrors = true;
  }

  // Observability: crash reporting. Sentry is bundled and initialized by
  // services/error-reporting.ts, but every env file shipped a placeholder
  // DSN — builds passed with crash reporting silently DISABLED and nobody
  // saw production errors. A production build must carry a real DSN.
  logInfo('Checking crash reporting (Sentry) configuration...');

  const sentryDsn = env.EXPO_PUBLIC_SENTRY_DSN;
  if (!sentryDsn || isPlaceholder(sentryDsn) || !/^https:\/\/[^@\s]+@sentry\.io\//.test(sentryDsn)) {
    logError(
      'EXPO_PUBLIC_SENTRY_DSN is missing or a placeholder — production ' +
      'builds currently ship with crash reporting disabled (silent failure). ' +
      'Configure a real Sentry DSN or remove @sentry/react-native.'
    );
    hasErrors = true;
  } else {
    logSuccess('EXPO_PUBLIC_SENTRY_DSN is configured');
  }

  // Check app.json for leftover placeholders (e.g. EAS projectId)
  logInfo('Checking app.json for placeholder values...');

  try {
    const appJsonPath = path.join(__dirname, '..', 'app.json');
    const appJsonRaw = fs.readFileSync(appJsonPath, 'utf8');

    const projectId = appJsonRaw.match(/"projectId"\s*:\s*"([^"]*)"/);
    if (projectId && /PLACEHOLDER|YOUR-EAS|your-eas|CONFIGURE|REPLACE_WITH/i.test(projectId[1])) {
      logError(
        'app.json expo.extra.eas.projectId is still a placeholder. ' +
        'Run "eas init" and paste the real project id.'
      );
      hasErrors = true;
    } else if (projectId && projectId[1]) {
      logSuccess('EAS projectId is configured');
    }

    const runtimeVersion = appJsonRaw.match(/"runtimeVersion"\s*:\s*("[^"]+"|\{)/);
    if (!runtimeVersion) {
      logError('app.json is missing runtimeVersion; EAS Update cannot target builds safely');
      hasErrors = true;
    } else {
      logSuccess('app.json runtimeVersion is configured');
    }
  } catch {
    logWarning('Could not read app.json to validate placeholders');
    hasWarnings = true;
  }

  // Check EAS submit placeholders
  logInfo('Checking eas.json submit configuration...');

  try {
    const easJsonPath = path.join(__dirname, '..', 'eas.json');
    const easJsonRaw = fs.readFileSync(easJsonPath, 'utf8');
    if (/REPLACE_WITH|CONFIGURE_|YOUR_/i.test(easJsonRaw)) {
      logError(
        'eas.json still contains submit/build placeholders. ' +
        'Configure App Store Connect and Play Store submit values before release.'
      );
      hasErrors = true;
    } else {
      logSuccess('EAS submit configuration has no obvious placeholders');
    }
  } catch {
    logWarning('Could not read eas.json to validate submit configuration');
    hasWarnings = true;
  }
  
  // v1 launches without AI. The code stays in the repo, but a production
  // build must not expose or call any AI surface.
  logInfo('Checking AI feature switch...');

  const aiFeatures = env.EXPO_PUBLIC_ENABLE_AI_FEATURES;
  const legacyAiChatbot = env.EXPO_PUBLIC_ENABLE_AI_CHATBOT;
  if (aiFeatures === 'true') {
    logError(
      'EXPO_PUBLIC_ENABLE_AI_FEATURES=true is not allowed for the v1 production launch. ' +
      'Keep AI disabled until privacy/moderation and the production AI key are ready.'
    );
    hasErrors = true;
  } else {
    logSuccess('AI features are disabled for production');
  }
  if (legacyAiChatbot === 'true') {
    logError('EXPO_PUBLIC_ENABLE_AI_CHATBOT=true is a legacy flag and must not be set in production');
    hasErrors = true;
  }

  // Check for debug mode
  logInfo('Checking debug mode configuration...');
  
  const debugMode = env.EXPO_PUBLIC_DEBUG_MODE;
  if (debugMode === 'true') {
    logError('EXPO_PUBLIC_DEBUG_MODE is enabled. Must be false for production');
    hasErrors = true;
  }
  
  // Check for mock API usage
  logInfo('Checking mock API configuration...');
  
  const useMockApi = env.EXPO_PUBLIC_USE_MOCK_API;
  if (useMockApi === 'true') {
    logError('EXPO_PUBLIC_USE_MOCK_API is enabled. Must be false for production');
    hasErrors = true;
  }

  // Legacy documented flag (EXPO_SETUP_COMPLETE.md) — same hazard.
  const useMockData = env.EXPO_PUBLIC_USE_MOCK_DATA;
  if (useMockData === 'true') {
    logError('EXPO_PUBLIC_USE_MOCK_DATA is enabled. Must be false for production');
    hasErrors = true;
  }
  
  // Summary
  logInfo('========================================');
  logInfo('Production Environment Validation Summary');
  logInfo('========================================');
  
  if (hasErrors) {
    logError('❌ Production environment validation FAILED');
    logError('Please fix the errors above before building for production.');
    process.exit(1);
  } else if (hasWarnings) {
    logWarning('⚠️  Production environment validation passed with warnings');
    logInfo('Review the warnings above before deploying.');
  } else {
    logSuccess('✅ Production environment validation PASSED');
  }
}

// Run validation
validateProductionEnvironment();
