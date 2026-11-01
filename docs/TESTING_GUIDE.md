# Testing Guide - AstroNemi App

## Overview

This guide covers the comprehensive testing strategy for payment and consultation flows in the AstroNemi app.

## Test Coverage

### Payment Flow Tests

**Location:** `__tests__/services/payment-service.test.ts`

Tests cover:
- Subscription plan validation
- Razorpay order creation
- Stripe payment intent creation
- Apple Pay / Google Pay availability
- Wallet balance operations
- Payment error handling

**Run tests:**
```bash
npm test -- payment-service.test.ts
```

### Consultation Service Tests

**Location:** `__tests__/services/consultation-service.test.ts`

Tests cover:
- Create consultation (chat, call, video)
- Start/End consultation
- Send/Receive messages
- Rate consultation
- Consultation history
- Status transitions

**Run tests:**
```bash
npm test -- consultation-service.test.ts
```

### Integration Tests

#### Payment Checkout Flow

**Location:** `__tests__/integration/payment-checkout.test.ts`

Tests complete checkout:
- Cart management
- Discount application
- Payment method selection
- Payment processing
- Transaction verification
- Order confirmation

**Run tests:**
```bash
npm test -- payment-checkout.test.ts
```

#### Consultation Booking Flow

**Location:** `__tests__/integration/consultation-booking.test.ts`

Tests complete booking:
- Astrologer selection
- Booking type selection
- Queue management
- Consultation start
- Error handling

**Run tests:**
```bash
npm test -- consultation-booking.test.ts
```

### Critical-Flow Tests

**Location:** `__tests__/e2e/app-flows.test.ts`

Covers service contracts for authentication, payments, consultations, and
kundli generation. Wallet top-up policy has a dedicated test at
`__tests__/services/wallet-topup.test.ts`: digital credits must use IAP, and the
legacy Razorpay helper must fail closed.

**Run tests:**
```bash
npm run test:smoke
```

Device-level Detox tests are not part of the managed Expo workflow or CI. If
they are reintroduced, add `detox` as a dev dependency, generate the native
projects with `expo prebuild`, and run them on an Android emulator runner.

## Running All Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- payment

# Run E2E tests
npm run test:e2e

# Run integration tests
npm test -- integration

# Watch mode
npm run test:watch
```

## Test Coverage Targets

Current coverage targets:
- **Branches:** 80%
- **Functions:** 80%
- **Lines:** 80%
- **Statements:** 80%

View coverage report:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Key Test Scenarios

### Payment Flow

1. **Wallet Top-up**
   - User initiates top-up
   - Selects payment method
   - Completes payment
   - Wallet balance updates

2. **Subscription Purchase**
   - User selects plan
   - Initiates payment
   - Payment verified
   - Subscription activated

3. **Consultation Payment**
   - User books consultation
   - Payment deducted from wallet
   - Consultation starts
   - Payment recorded

### Consultation Flow

1. **Instant Booking**
   - User selects astrologer
   - Chooses instant booking
   - Joins queue
   - Consultation starts when position = 1

2. **Scheduled Booking**
   - User selects astrologer
   - Chooses scheduled booking
   - Selects time slot
   - Booking confirmed

3. **Chat Consultation**
   - Consultation starts
   - Messages exchanged
   - Session ends
   - User rates consultation

## Mocking Strategy

### Supabase Mocking

```typescript
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: null, 
            error: null 
          })),
        })),
      })),
    })),
  },
  isSupabaseConfigured: jest.fn(() => false),
}));
```

### Payment Gateway Mocking

```typescript
jest.mock('react-native-razorpay', () => ({
  open: jest.fn((options) => Promise.resolve({
    razorpay_payment_id: 'pay_123',
    razorpay_order_id: 'order_456',
    razorpay_signature: 'sig_789',
  })),
}));
```

## Debugging Tests

### Enable Debug Logging

```typescript
// In test file
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
  console.log.mockRestore();
  console.error.mockRestore();
});
```

### Run Single Test

```bash
npm test -- --testNamePattern="wallet top-up"
```

### Run with Verbose Output

```bash
npm test -- --verbose
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-deployment

See `.github/workflows/ci.yml` for configuration.

## Performance Testing

### Bundle Size Analysis

```bash
npm run build:production
npm run analyze:bundle
```

### Performance Metrics

- Initial load time: < 3s
- Time to interactive: < 5s
- Payment flow: < 2s
- Consultation booking: < 1.5s

## Accessibility Testing

Tests verify:
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Touch target sizes

Run accessibility tests:
```bash
npm test -- accessibility
```

## Best Practices

1. **Test Isolation**
   - Each test should be independent
   - Clear setup and teardown
   - No shared state

2. **Meaningful Assertions**
   - Test behavior, not implementation
   - Use descriptive test names
   - One assertion per test when possible

3. **Mock External Dependencies**
   - Mock API calls
   - Mock payment gateways
   - Mock storage

4. **Error Scenarios**
   - Test happy path
   - Test error cases
   - Test edge cases

5. **Performance**
   - Keep tests fast
   - Avoid unnecessary waits
   - Use jest.useFakeTimers() for time-based tests

## Troubleshooting

### Tests Timing Out

```typescript
// Increase timeout for specific test
it('should complete payment', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Mock Not Working

```typescript
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Async Issues

```typescript
// Use async/await properly
it('should fetch data', async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing](https://reactnative.dev/docs/testing-overview)
- [Testing Library](https://testing-library.com/)
- [Supabase Testing](https://supabase.com/docs/guides/testing)
