# AstroNemi App - Comprehensive Code Audit Report

**Date:** March 13, 2026  
**Auditor:** Senior Software Architect  
**Version:** 1.0.0

---

## Executive Summary

This is a React Native/Expo mobile application for Vedic astrology services with 60+ screens, comprehensive authentication, payment integration, and real-time communication features. While the project demonstrates solid foundational architecture, there are significant areas requiring attention for production readiness.

---

## 1. Major Architectural Issues

### 1.1 Monolithic Component Structure

**Issue:** Over 60 screen components in `app/` directory, many exceeding 15,000+ characters.

**Evidence:**
- [`app/(tabs)/kundli.tsx`](app/(tabs)/kundli.tsx) - 53,305 chars (CRITICAL)
- [`app/ai-chatbot.tsx`](app/ai-chatbot.tsx) - 29,737 chars
- [`app/community.tsx`](app/community.tsx) - 28,969 chars
- [`app/tarot.tsx`](app/tarot.tsx) - 27,663 chars
- [`app/transit.tsx`](app/transit.tsx) - 31,942 chars
- [`app/wallet.tsx`](app/wallet.tsx) - 24,548 chars
- [`app/vastu.tsx`](app/vastu.tsx) - 29,599 chars

**Recommendation:** Split components into:
- Presentational components (UI only)
- Container components (logic + state)
- Custom hooks for shared logic
- Separate feature modules

### 1.2 Code Duplication Pattern

**Pattern Identified:** Nearly identical UI patterns across screens:

```typescript
// Repeated in 20+ files:
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const [selectedItem, setSelectedItem] = useState<Item | null>(null);
const [showModal, setShowModal] = useState(false);

// Category selection pattern:
onPress={() => setSelectedCategory(cat.id)}

// Modal handling pattern:
presentationStyle="pageSheet"
onRequestClose={() => setSelectedItem(null)}
```

**Affected Files:** videos.tsx, podcasts.tsx, mantras.tsx, meditation.tsx, courses.tsx, blog.tsx, news.tsx, vastu.tsx, dreams.tsx, festivals.tsx, lal-kitab.tsx, muhurat.tsx, and 15+ more

**Recommendation:** Create reusable components:
- `CategorySelector` component
- `ItemCard` component  
- `DetailModal` component
- `useCategoryFilter` hook

### 1.3 Constants File Size

**Issue:** [`constants/astrology.ts`](constants/astrology.ts) - 38,913 characters

**Recommendation:** 
- Split into multiple files by domain (planets.ts, signs.ts, houses.ts, nakshatras.ts)
- Move to separate astrology-data package
- Use lazy loading for heavy data

### 1.4 Single Hooks File

**Issue:** [`hooks/index.ts`](hooks/index.ts) - 382 lines containing ALL custom hooks

**Recommendation:** Split into domain-specific hooks:
- `hooks/useApi.ts` - API-related hooks
- `hooks/useStorage.ts` - Storage operations
- `hooks/useAuth.ts` - Authentication helpers
- `hooks/useDevice.ts` - Device capabilities

---

## 2. Security Risks

### 2.1 Environment Variables (HIGH RISK)

**File:** [`.env.production`](.env.production)

| Variable | Risk Level | Issue |
|----------|------------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | CRITICAL | Server-side key exposed in client |
| `RAZORPAY_KEY_SECRET` | CRITICAL | Payment secret in client code |
| `AGORA_APP_CERTIFICATE` | HIGH | Video call secret exposed |
| `SENTRY_AUTH_TOKEN` | HIGH | Internal tool token exposed |
| `JWT_SECRET` | HIGH | Authentication secret in frontend |
| `ENCRYPTION_KEY` | HIGH | Encryption key in frontend |

**Note:** Environment variables starting with `EXPO_PUBLIC_` are exposed to the client bundle. Only non-prefixed variables stay server-side.

### 2.2 Hardcoded Test Credentials (HIGH RISK)

**File:** [`.env.example`](.env.example:173)
```
TEST_OTP_CODE=123456
TEST_PHONE_NUMBERS=+919999999999,+918888888888
```

**Issue:** Test OTP bypass code in example file that developers may accidentally use in production.

### 2.3 Local OTP Storage (MEDIUM RISK)

**File:** [`contexts/AuthContext.tsx`](contexts/AuthContext.tsx:39-69)

```typescript
const otpStore = new Map<string, { otp: string; expiry: number; attempts: number }>();
```

**Issue:** OTPs stored in memory map are vulnerable to:
- Memory dump attacks
- No encryption at rest
- Lost on app restart (but also means not persisted securely)

### 2.4 API Security Gaps

**File:** [`services/api.ts`](services/api.ts)

- No request signing mechanism
- No request/response encryption
- Missing CSRF tokens (though Expo handles this)
- No API key rotation mechanism

---

## 3. Performance Problems

### 3.1 Bundle Size Concerns

**Large Constants:**
- `constants/astrology.ts` - 38KB+ of inline data
- `utils/interpretations.ts` - 43KB+ of text
- All loaded at app startup

**Recommendation:** 
- Implement code splitting
- Lazy load astrology utilities
- Move large data to assets/remote

### 3.2 Missing Lazy Loading

**Current:** All 60+ screens bundled together in main app.

**Evidence:** No dynamic imports found in codebase.

**Recommendation:** Use Expo Router's built-in lazy loading:
```typescript
const HeavyScreen = lazy(() => import('./HeavyScreen'));
```

### 3.3 Inefficient State Management

**Issue:** Multiple contexts re-rendering entire app:
- AuthContext
- UserContext  
- CartContext
- AppContext
- ThemeContext
- LanguageContext
- ToastContext

**Evidence:** [`app/_layout.tsx`](app/_layout.tsx:1-30) wraps entire app in 7+ providers.

**Recommendation:**
- Implement context splitting
- Use useMemo/useCallback to prevent unnecessary re-renders
- Consider Zustand for global state (already in dependencies)

### 3.4 Large Component Re-renders

**Pattern:** Each screen has multiple useState calls without memoization:

```typescript
// In kundli.tsx and many others:
const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
const [showDetails, setShowDetails] = useState(true);
const [loading, setLoading] = useState(false);
```

---

## 4. Maintainability Issues

### 4.1 Type Safety Gaps

**Widespread:** Extensive use of `any` type:

```typescript
// In api.ts:
async getHoroscope(sign: string, timeframe: any): Promise<ApiResponse<any>>
async updateProfile(userId: string, updates: Record<string, any>)
async create(consultation: Record<string, any>)
```

### 4.2 Missing Error Boundaries

**Issue:** No error boundary components wrapping critical UI sections.

**Recommendation:** Add ErrorBoundary from [`components/ErrorBoundary.tsx`](components/ErrorBoundary.tsx) to wrap:
- Each tab
- Each modal
- Each list

### 4.3 Inconsistent Naming Conventions

**Mixed Patterns:**
- camelCase: `selectedCategory`, `showModal`
- PascalCase: `WesternSign`, `KundliData`
- SCREAMING_SNAKE_CASE: `DEFAULT_COUNTRY_CODE`, `RASHI_NAMES`

### 4.4 Missing Loading States

**Inconsistent:** Some screens have proper loading states, others don't:
- `panchang.tsx` - has loading state
- `shop.tsx` - has loading state  
- Many others missing

---

## 5. Refactoring Recommendations

### 5.1 Priority 1 - Critical (Before Production)

1. **Remove sensitive env vars from client:**
   ```typescript
   // BAD
   EXPO_PUBLIC_RAZORPAY_KEY_SECRET=xxx
   
   // GOOD - use server-side only
   RAZORPAY_KEY_SECRET=xxx  // NOT prefixed with EXPO_PUBLIC_
   ```

2. **Remove test credentials:**
   - Delete TEST_OTP_CODE from all environments
   - Implement proper OTP delivery

3. **Add rate limiting display:**
   - Show countdown timer in OTP UI
   - Display rate limit messages properly

### 5.2 Priority 2 - High Value

1. **Create reusable UI components:**
   ```
   components/
   ├── CategorySelector/
   ├── ItemCard/
   ├── DetailModal/
   ├── LoadingState/
   └── EmptyState/
   ```

2. **Extract custom hooks:**
   ```
   hooks/
   ├── useCategory.ts
   ├── usePagination.ts
   ├── useFilters.ts
   └── useInfiniteScroll.ts
   ```

3. **Split constants:**
   ```
   constants/
   ├── planets.ts
   ├── signs.ts
   ├── houses.ts
   ├── nakshatras.ts
   └── themes.ts
   ```

### 5.3 Priority 3 - Optimization

1. **Implement lazy loading:**
   - Add React.lazy for heavy screens
   - Split astrology calculations into web workers

2. **Optimize context providers:**
   - Memoize context values
   - Split large contexts

3. **Add comprehensive TypeScript types:**
   - Replace `any` with proper interfaces
   - Add generics to API functions

---

## 6. Code Quality Summary

| Metric | Score | Notes |
|--------|-------|-------|
| Architecture | 6/10 | Good structure but needs modularization |
| Security | 4/10 | Multiple critical vulnerabilities |
| Performance | 5/10 | Bundle size and re-render issues |
| Maintainability | 5/10 | Type safety and duplication concerns |
| Testability | 3/10 | Limited test coverage in __tests__ |

---

## Recommended Next Steps

1. **Immediate:** Fix environment variable exposure
2. **This Sprint:** Create reusable UI component library
3. **This Month:** Implement code splitting and lazy loading
4. **Ongoing:** Add TypeScript strict mode and fix type errors

---

*Report generated by Code Audit System*
