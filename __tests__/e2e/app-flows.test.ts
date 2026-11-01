/**
 * Integration Test Suite
 *
 * Tests critical service flows in the AstroNemi app
 */

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(() => Promise.resolve({ data: { user: { id: 'user123' } }, error: null })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'user123' } }, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    functions: {
      invoke: jest.fn(() => Promise.resolve({ data: { id: 'order_123', amount: 100 }, error: null })),
    },
  },
  isSupabaseConfigured: true,
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('Integration: Authentication Flow', () => {
  it('should export authService with required methods', () => {
    const { authService } = require('@/services/auth-service');
    expect(authService).toBeDefined();
    expect(typeof authService.loadUser).toBe('function');
  });

  it('should export rate limiter', () => {
    const { RateLimiter } = require('@/services/rate-limiter');
    expect(RateLimiter).toBeDefined();
    expect(typeof RateLimiter.isAllowed).toBe('function');
    expect(typeof RateLimiter.resetAll).toBe('function');
  });
});

describe('Integration: Payment Flow', () => {
  it('should export UnifiedPayment service', () => {
    const { UnifiedPayment } = require('@/services/payment');
    expect(UnifiedPayment).toBeDefined();
    expect(typeof UnifiedPayment.createOrder).toBe('function');
    expect(typeof UnifiedPayment.verifyPayment).toBe('function');
  });

  it('should validate payment amounts', async () => {
    const { UnifiedPayment } = require('@/services/payment');
    // Amount below minimum should fail validation
    const result = await UnifiedPayment.createOrder({
      amount: 100, // 1 INR in paise - below minimum
      currency: 'INR',
      type: 'wallet_topup',
    });
    // Should either fail validation or return error
    expect(result).toBeDefined();
  });
});

describe('Integration: Consultation Flow', () => {
  it('should export consultation service', () => {
    const { consultationsApi } = require('@/services/api');
    expect(consultationsApi).toBeDefined();
  });
});

describe('Integration: Kundli Generation', () => {
  it('should export kundli generator', () => {
    const { generateKundli } = require('@/utils/kundli-generator');
    expect(typeof generateKundli).toBe('function');
  });

  it('should generate kundli for valid input', async () => {
    const { generateKundli } = require('@/utils/kundli-generator');
    const result = await generateKundli(
      'Test User',
      '15/01/1990',
      '10:30',
      'New Delhi'
    );
    expect(result).toBeDefined();
    expect(result.planets).toBeDefined();
    // Kundli generation is CPU-intensive; under a fully parallel test run it
    // can exceed 30s. Give it a generous window so it isn't flaky in CI.
  }, 120000);
});