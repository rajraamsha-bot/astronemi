/**
 * App Configuration Constants
 *
 * Centralized configuration for the AstroNemi app.
 * All magic numbers and hardcoded values should be moved here.
 */

// ============================================
// AUTHENTICATION
// ============================================

export const AUTH_CONFIG = {
  OTP: {
    LENGTH: 6,
    EXPIRY_SECONDS: 300, // 5 minutes
    MAX_ATTEMPTS: 5,
    RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    DAILY_FREE_MESSAGES: 5,
  },
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 10,
    DEFAULT_COUNTRY_CODE: '+91',
  },
  DEVICE: {
    MAX_DEVICES_PER_USER: 2,
  },
  REFERRAL: {
    BONUS_AMOUNT: 100, // INR
    CODE_LENGTH: 8,
  },
  WALLET: {
    INITIAL_BALANCE: 100, // INR for new users
    MIN_TOPUP_AMOUNT: 50,
    MAX_TOPUP_AMOUNT: 10000,
  },
};

// ============================================
// PAYMENT
// ============================================

export const PAYMENT_CONFIG = {
  RAZORPAY: {
    KEY_ID_ENV_VAR: 'EXPO_PUBLIC_RAZORPAY_KEY_ID',
    CURRENCY: 'INR',
    MULTIPLIER: 100, // Convert INR to paise
  },
  SUBSCRIPTION: {
    PLANS: {
      BASIC: 'basic',
      PREMIUM: 'premium',
      GOLD: 'gold',
    } as const,
    DURATIONS: {
      MONTHLY: 'monthly',
      YEARLY: 'yearly',
      LIFETIME: 'lifetime',
    } as const,
  },
  CONSULTATION: {
    MIN_DURATION_MINUTES: 10,
    MAX_DURATION_MINUTES: 60,
  },
};

// ============================================
// ANALYTICS
// ============================================

export const ANALYTICS_CONFIG = {
  EVENTS: {
    APP_OPENED: 'app_opened',
    SCREEN_VIEW: 'screen_view',
    CONSULTATION_BOOKED: 'consultation_booked',
    PAYMENT_COMPLETED: 'payment_completed',
    SUBSCRIPTION_STARTED: 'subscription_started',
    KUNDLI_GENERATED: 'kundli_generated',
    ASTROLOGER_VIEWED: 'astrologer_viewed',
    CHAT_MESSAGE_SENT: 'chat_message_sent',
    VIDEO_CALL_STARTED: 'video_call_started',
    AI_CHAT_STARTED: 'ai_chat_started',
  },
  MIXPANEL_TOKEN_ENV_VAR: 'EXPO_PUBLIC_MIXPANEL_TOKEN',
  FIREBASE_ANALYTICS_ENV_VAR: 'EXPO_PUBLIC_FIREBASE_ANALYTICS',
};

// ============================================
// PERFORMANCE
// ============================================

export const PERFORMANCE_CONFIG = {
  BUNDLE: {
    MAX_SIZE_KB: 15000,
    SPLIT_CHUNKS: true,
    LAZY_LOAD_THRESHOLD: 0.1, // 10% of bundle
  },
  MONITORING: {
    INTERVAL_MS: 60000,
    ERROR_TRACKING_INTERVAL_MS: 30000,
  },
  BUDGETS: {
    FIRST_CONTENTFUL_PAINT_MS: 1800,
    LARGEST_CONTENTFUL_PAINT_MS: 2500,
    FIRST_INPUT_DELAY_MS: 100,
    TIME_TO_INTERACTIVE_MS: 3800,
  },
};

// ============================================
// UI/UX
// ============================================

export const UI_CONFIG = {
  CARD: {
    DEFAULT_PADDING: 16,
    MIN_WIDTH_PERCENT: 45,
    SHADOW_RADIUS: 8,
    ELEVATION: 3,
  },
  BUTTON: {
    MIN_HEIGHT: 44,
    MIN_WIDTH: 48,
    BORDER_RADIUS: 8,
  },
  LIST: {
    VIRTUALIZATION_THRESHOLD: 10,
    ITEM_MARGIN: 8,
  },
  IMAGE: {
    MAX_WIDTH: 1024,
    DEFAULT_RESIZE_MODE: 'cover',
    CACHE_STRATEGY: 'memory',
  },
  ANIMATION: {
    DEFAULT_DURATION_MS: 300,
    SPRING_DAMPING: 15,
    SPRING_STIFFNESS: 150,
  },
};

// ============================================
// ADMIN DASHBOARD
// ============================================

export const ADMIN_CONFIG = {
  METRICS: {
    USER_GROWTH_DEFAULT: '+12%',
    REVENUE_GROWTH_DEFAULT: '+8%',
    SESSIONS_GROWTH_DEFAULT: '+15%',
    CONVERSION_IMPROVEMENT_DEFAULT: '+2.5%',
  },
  ALERTS: {
    MAX_DISPLAY: 5,
    DEFAULT_SEVERITY: 'medium' as const,
    AUTO_RESOLVE_AFTER_MS: 24 * 60 * 60 * 1000, // 24 hours
  },
  HEALTH: {
    API_RESPONSE_TIME_WARNING_MS: 2000,
    ERROR_RATE_WARNING_PERCENT: 5,
    MEMORY_USAGE_WARNING_PERCENT: 80,
    CRASH_RATE_WARNING_PERCENT: 1,
  },
  ACTIVITY: {
    SAMPLE_ACTIVITIES: [
      { action: 'New user registration', icon: 'user' },
      { action: 'Payment completed', icon: 'dollar' },
      { action: 'Consultation booked', icon: 'calendar' },
      { action: 'Kundli generated', icon: 'file' },
    ] as const,
  },
};

// ============================================
// SUPPORTED LANGUAGES
// ============================================

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
] as const;

// ============================================
// ASTROLOGY SPECIFIC
// ============================================

export const ASTROLOGY_CONFIG = {
  HOUSE_SYSTEM: 'Placidus',
  ZODIAC_SYSTEM: 'Sidereal', // For Vedic astrology
  DEFAULT_TIME_FORMAT: '24h',
  MAX_AGE_FOR_BIRTH: 120,
  MIN_AGE_FOR_BIRTH: 0,
  COORDINATES: {
    DEFAULT_LATITUDE: 20.5937,
    DEFAULT_LONGITUDE: 78.9629,
    DEFAULT_TIMEZONE: 'Asia/Kolkata',
  },
  KUNDLI: {
    MAX_RECENT_SAVED: 10,
    DEFAULT_LAYOUT: 'NorthIndian',
    SUPPORTED_LAYOUTS: ['NorthIndian', 'SouthIndian', 'EastIndian'] as const,
  },
  MUHURAT: {
    MIN_DURATION_HOURS: 1,
    MAX_DURATION_DAYS: 30,
  },
};

// ============================================
// CONSULTATION
// ============================================

export const CONSULTATION_CONFIG = {
  TYPES: {
    CHAT: 'chat',
    VOICE: 'voice',
    VIDEO: 'video',
  } as const,
  DURATIONS: {
    QUICK: 15, // minutes
    STANDARD: 30,
    EXTENDED: 60,
  },
  GRACE_PERIOD_MINUTES: 5,
  CUTOFF_MINUTES_BEFORE: 60,
  RATING: {
    MIN: 1,
    MAX: 5,
  },
  PRICING: {
    MIN_AMOUNT_INR: 100,
    DEFAULT_RATE_PER_MINUTE_INR: 5,
  },
};

// ============================================
// AI CHATBOT
// ============================================

export const AI_CHATBOT_CONFIG = {
  MAX_MESSAGES_PER_DAY_FREE: 5,
  MESSAGE_CHAR_LIMIT: 500,
  QUICK_QUESTIONS_COUNT: 5,
  RESPONSE_TIMEOUT_MS: 30000,
  EDGE_FUNCTION_NAME: 'ai-chat',
};

// ============================================
// NOTIFICATIONS
// ============================================

export const NOTIFICATIONS_CONFIG = {
  CHANNELS: {
    REMINDERS: 'reminders',
    CONSULTATIONS: 'consultations',
    PROMOTIONS: 'promotions',
    SYSTEM: 'system',
  },
  REMINDER: {
    DEFAULT_ADVANCE_MINUTES: 30,
    MAX_REMINDERS_PER_CONSULTATION: 3,
  },
};

// ============================================
// ERROR HANDLING
// ============================================

export const ERROR_CONFIG = {
  RETRY: {
    MAX_ATTEMPTS: 3,
    BACKOFF_FACTOR: 2,
    INITIAL_DELAY_MS: 1000,
  },
  OFFLINE: {
    MAX_QUEUE_SIZE: 100,
    SYNC_INTERVAL_MS: 30000,
  },
  FALLBACK: {
    ENABLED: true,
    CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  },
};

// ============================================
// OFFLINE SUPPORT
// ============================================

export const OFFLINE_CONFIG = {
  STORAGE: {
    MAX_SIZE_MB: 50,
    COMPRESSION_ENABLED: true,
  },
  SYNC: {
    BATCH_SIZE: 10,
    INTERVAL_MS: 30000,
    CONFLICT_RESOLUTION: 'client_wins', // or 'server_wins', 'merge'
  },
  QUEUE: {
    PRIORITY_LEVELS: ['high', 'medium', 'low'] as const,
    MAX_RETRIES: 5,
  },
};

// ============================================
// SECURITY
// ============================================

export const SECURITY_CONFIG = {
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
  },
  SESSION: {
    TOKEN_REFRESH_INTERVAL_MS: 14 * 24 * 60 * 60 * 1000, // 14 days
    IDLE_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  },
  RATE_LIMIT: {
    API: {
      WINDOW_MS: 15 * 60 * 1000,
      MAX_REQUESTS: 100,
    },
    AUTH: {
      WINDOW_MS: 15 * 60 * 1000,
      MAX_ATTEMPTS: 5,
      BLOCK_DURATION_MS: 30 * 60 * 1000,
    },
  },
};

// ============================================
// BUNDLE ANALYSIS
// ============================================

export const BUNDLE_CONFIG = {
  MAX_CHUNK_SIZE_KB: 500,
  CRITICAL_CHUNK_SIZE_KB: 200,
  WARNING_CHUNK_SIZE_KB: 100,
  ANALYZE_COMMAND: 'npx expo export --dump-sourcemap',
};

// ============================================
// TESTING
// ============================================

export const TEST_CONFIG = {
  MOCK: {
    DELAY_MS: 500,
    ERROR_RATE: 0.1,
  },
  E2E: {
    DEFAULT_TIMEOUT_MS: 10000,
    SCREENSHOT_ON_FAILURE: true,
    VIDEO_RECORDING_ENABLED: false,
  },
  UNIT: {
    COVERAGE_THRESHOLD: 80,
    STRICT_MODE: true,
  },
};

// Default export for convenience
export default {
  AUTH_CONFIG,
  PAYMENT_CONFIG,
  ANALYTICS_CONFIG,
  PERFORMANCE_CONFIG,
  UI_CONFIG,
  ADMIN_CONFIG,
  SUPPORTED_LANGUAGES,
  ASTROLOGY_CONFIG,
  CONSULTATION_CONFIG,
  AI_CHATBOT_CONFIG,
  NOTIFICATIONS_CONFIG,
  ERROR_CONFIG,
  OFFLINE_CONFIG,
  SECURITY_CONFIG,
  BUNDLE_CONFIG,
  TEST_CONFIG,
};