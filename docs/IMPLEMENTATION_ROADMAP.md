# AstroNemi Implementation Roadmap

Complete implementation guide for production readiness.

---

## 📅 Week 1: Critical Production Setup

### ✅ Task 1: Environment Configuration (Day 1-2)

**Files to update:**
- `.env.production`
- GitHub Secrets
- `app.json` (if needed)

**Steps:**
1. **Supabase Setup**
   ```bash
   # Create project at https://supabase.com
   # Get credentials from Project Settings → API
   ```
   
2. **Razorpay Setup**
   ```bash
   # Sign up at https://razorpay.com
   # Get API keys from Dashboard → Settings → API Keys
   ```

3. **Agora Setup**
   ```bash
   # Sign up at https://www.agora.io
   # Create project and get App ID
   ```

4. **Sentry Setup**
   ```bash
   # Sign up at https://sentry.io
   # Create project and get DSN
   ```

**Verification:**
```bash
npm run start
# Check console for configuration warnings
```

---

### ✅ Task 2: Payment Integration (Day 2-3)

**Installation:**
```bash
npm install react-native-razorpay
```

**Implementation:**
- ✅ Created: `services/payment-razorpay.ts`
- Update: `services/payment.ts` to use new implementation
- Test: All payment flows

**Testing Checklist:**
- [ ] Wallet top-up (₹100, ₹500, ₹1000)
- [ ] Consultation payment
- [ ] Subscription payment (all tiers)
- [ ] Product purchase
- [ ] Payment failure handling
- [ ] Webhook verification

**Test Script:**
```typescript
// Add to __tests__/services/payment-razorpay.test.ts
import { processRazorpayPayment } from '@/services/payment-razorpay';

test('should process payment successfully', async () => {
  const result = await processRazorpayPayment(10000, 'Test payment');
  expect(result.success).toBe(true);
});
```

---

### ✅ Task 3: Sentry Integration (Day 3-4)

**Installation:**
```bash
npm install @sentry/react-native
npx @sentry/wizard -i reactNative
```

**Implementation:**
- ✅ Created: `services/sentry-integration.ts`
- Update: `app/_layout.tsx` to initialize Sentry
- Update: `services/crash-reporting.ts` to use Sentry

**Integration in app/_layout.tsx:**
```typescript
import { initializeSentry } from '@/services/sentry-integration';

export default function RootLayout() {
  useEffect(() => {
    initializeSentry();
  }, []);
  
  // ... rest of layout
}
```

**Testing:**
```typescript
import { testSentry } from '@/services/sentry-integration';

// In development, test Sentry
if (__DEV__) {
  testSentry();
}
```

---

### ✅ Task 4: Accessibility Fixes (Day 4-5)

**Implementation:**
- ✅ Created: `utils/accessibility-helpers.ts`
- Update: Priority screens with accessibility labels

**Priority Screens:**
1. **Login/OTP Screen** (`app/login.tsx`)
2. **Home Screen** (`app/(tabs)/index.tsx`)
3. **Kundli Generation** (`app/(tabs)/kundli.tsx`)
4. **Astrologer List** (`app/(tabs)/astrologers.tsx`)
5. **Payment Screens** (`app/checkout.tsx`, `app/wallet.tsx`)

**Example Implementation:**
```typescript
import { createButtonA11yProps } from '@/utils/accessibility-helpers';

<TouchableOpacity
  {...createButtonA11yProps('Send OTP', 'Sends verification code to your phone')}
  onPress={handleSendOTP}
>
  <Text>Send OTP</Text>
</TouchableOpacity>
```

**Testing:**
- iOS: Settings → Accessibility → VoiceOver
- Android: Settings → Accessibility → TalkBack

**Color Contrast Check:**
```typescript
import { meetsWCAGAA } from '@/utils/accessibility-helpers';

const textColor = '#333333';
const backgroundColor = '#FFFFFF';
const isAccessible = meetsWCAGAA(textColor, backgroundColor);
// Should return true (contrast ratio: 12.6:1)
```

---

## 📅 Month 1: Quality & Performance

### Task 1: Increase Test Coverage to 80% (Week 2-3)

**Current Coverage:** ~40%
**Target:** 80%+

**Installation:**
```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native
```

**Areas to Cover:**
1. **Component Tests** (Priority)
   - Button, Card, FormInput
   - LocationPicker, SkeletonLoader
   - Kundli components

2. **Integration Tests**
   - Login flow
   - Kundli generation flow
   - Payment flow
   - Cart checkout flow

3. **E2E Tests**
   - Critical user journeys

**Example Component Test:**
```typescript
// __tests__/components/Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import Button from '@/components/Button';

describe('Button', () => {
  it('should call onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button onPress={onPress}>Click Me</Button>
    );
    
    fireEvent.press(getByText('Click Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

**Run Coverage:**
```bash
npm test -- --coverage --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80}}'
```

---

### Task 2: React Query Integration (Week 3)

**Installation:**
```bash
npm install @tanstack/react-query
```

**Setup:**
```typescript
// app/_layout.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... */}
    </QueryClientProvider>
  );
}
```

**Example Usage:**
```typescript
// hooks/queries/useAstrologers.ts
import { useQuery } from '@tanstack/react-query';
import { astrologersApi } from '@/services/api';

export function useAstrologers(filters?: any) {
  return useQuery({
    queryKey: ['astrologers', filters],
    queryFn: () => astrologersApi.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

---

### Task 3: Monitoring Dashboards (Week 4)

**Sentry Dashboard:**
1. Set up alerts for error rate > 1%
2. Configure Slack notifications
3. Set up performance monitoring
4. Create custom dashboards

**Mixpanel Dashboard:**
1. Track key events (login, payment, consultation)
2. Create funnels (signup → first consultation)
3. Set up cohort analysis
4. Monitor retention metrics

**Custom Health Dashboard:**
```typescript
// Create admin dashboard at app/admin/health.tsx
import { useHealthMetrics } from '@/hooks/useHealthMetrics';

export default function HealthDashboard() {
  const { metrics } = useHealthMetrics();
  
  return (
    <View>
      <Text>API Response Time: {metrics.apiResponseTime}ms</Text>
      <Text>Error Rate: {metrics.errorRate}%</Text>
      <Text>Active Users: {metrics.activeUsers}</Text>
    </View>
  );
}
```

---

## 📅 Quarter 1: Advanced Features

### Task 1: Offline-First Architecture (Month 2)

**Installation:**
```bash
npm install @react-native-async-storage/async-storage
npm install react-query-persist-client
```

**Implementation:**
1. **Offline Queue**
   ```typescript
   // services/offline-queue.ts
   export class OfflineQueue {
     async addToQueue(request: any) {
       // Store failed requests
     }
     
     async processQueue() {
       // Retry when online
     }
   }
   ```

2. **Sync Manager**
   ```typescript
   // services/sync-manager.ts
   export class SyncManager {
     async syncData() {
       // Sync local data with server
     }
   }
   ```

3. **Offline Indicators**
   - Show offline banner
   - Queue actions
   - Sync when online

---

### Task 2: Advanced Analytics (Month 2-3)

**Features:**
1. **User Behavior Tracking**
   - Screen time
   - Feature usage
   - User flow analysis

2. **Business Metrics**
   - Revenue tracking
   - Conversion rates
   - Churn analysis

3. **A/B Testing**
   - Feature flags
   - Variant testing
   - Statistical analysis

**Implementation:**
```typescript
// services/advanced-analytics.ts
export class AdvancedAnalytics {
  trackUserJourney(events: Event[]) {
    // Track complete user journey
  }
  
  calculateConversionRate(funnel: string) {
    // Calculate funnel conversion
  }
  
  runABTest(testId: string, variant: string) {
    // A/B test implementation
  }
}
```

---

### Task 3: Admin Dashboard (Month 3)

**Features:**
1. **User Management**
   - View all users
   - Edit profiles
   - Manage subscriptions

2. **Content Management**
   - Manage astrologers
   - Update horoscopes
   - Manage products

3. **Analytics**
   - Revenue reports
   - User analytics
   - System health

**Tech Stack:**
- Next.js for admin panel
- Supabase for backend
- Recharts for visualizations

---

### Task 4: A/B Testing Framework (Month 3)

**Installation:**
```bash
npm install @growthbook/growthbook-react
```

**Setup:**
```typescript
// contexts/ABTestContext.tsx
import { GrowthBook } from '@growthbook/growthbook-react';

const gb = new GrowthBook({
  apiHost: 'https://cdn.growthbook.io',
  clientKey: 'your-client-key',
  enableDevMode: __DEV__,
});

export function ABTestProvider({ children }) {
  return (
    <GrowthBookProvider growthbook={gb}>
      {children}
    </GrowthBookProvider>
  );
}
```

**Usage:**
```typescript
import { useFeature } from '@growthbook/growthbook-react';

function MyComponent() {
  const feature = useFeature('new-checkout-flow');
  
  if (feature.on) {
    return <NewCheckoutFlow />;
  }
  return <OldCheckoutFlow />;
}
```

---

## 🎯 Success Metrics

### Week 1
- [ ] All environment variables configured
- [ ] Payment integration complete
- [ ] Sentry capturing errors
- [ ] Critical screens accessible

### Month 1
- [ ] Test coverage > 80%
- [ ] React Query integrated
- [ ] Monitoring dashboards live
- [ ] Performance optimized

### Quarter 1
- [ ] Offline mode working
- [ ] Advanced analytics tracking
- [ ] Admin dashboard deployed
- [ ] A/B testing framework active

---

## 📚 Resources

### Documentation
- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Razorpay Documentation](https://razorpay.com/docs)
- [Sentry Documentation](https://docs.sentry.io)

### Tools
- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
- [Flipper](https://fbflipper.com)
- [Reactotron](https://github.com/infinitered/reactotron)

### Testing
- [Testing Library](https://testing-library.com/docs/react-native-testing-library/intro)
- [Jest](https://jestjs.io)
- [Detox](https://wix.github.io/Detox)

---

## 🚨 Important Notes

1. **Never commit secrets** - Use environment variables
2. **Test on real devices** - Simulators don't catch all issues
3. **Monitor production** - Set up alerts for critical errors
4. **Backup data** - Regular database backups
5. **Document changes** - Keep changelog updated

---

## 📞 Support

For issues or questions:
- GitHub Issues: [Your Repo]
- Email: support@astronemi.app
- Slack: #astronemi-dev
