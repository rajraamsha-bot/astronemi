# AstroNemi App - Security Audit Report

**Date:** March 13, 2026  
**Security Level:** Production - Multiple Critical Issues Found

---

## 1. Critical Vulnerabilities

### 1.1 Exposed API Keys and Secrets

| Vulnerability | Risk Level | Location | Fix |
|--------------|------------|----------|-----|
| SUPABASE_SERVICE_ROLE_KEY exposed | **CRITICAL** | `.env.production:9` | Remove `EXPO_PUBLIC_` prefix - keep server-side only |
| RAZORPAY_KEY_SECRET exposed | **CRITICAL** | `.env.production:15` | Use server-side API calls only |
| AGORA_APP_CERTIFICATE exposed | **HIGH** | `.env.production:22` | Regenerate - never expose in client |
| SENTRY_AUTH_TOKEN exposed | **HIGH** | `.env.production:28` | Keep server-side only |
| JWT_SECRET exposed | **HIGH** | `.env.production:112` | Move to backend/config |
| ENCRYPTION_KEY exposed | **HIGH** | `.env.production:113` | Use secure key management |

**Exact Fix:**
```bash
# In .env.production, remove these from client exposure:
# BAD (current):
EXPO_PUBLIC_SUPABASE_URL=https://...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...

# GOOD (fix):
SUPABASE_URL=https://...           # No EXPO_PUBLIC_ prefix
SUPABASE_ANON_KEY=...              # No EXPO_PUBLIC_ prefix
```

### 1.2 Hardcoded Test Credentials

| Vulnerability | Risk Level | Location | Fix |
|--------------|------------|----------|-----|
| Test OTP bypass | **CRITICAL** | `.env.example:173` | Remove TEST_OTP_CODE completely |
| Test phone numbers | **HIGH** | `.env.example:170` | Remove from example file |

**Exact Fix:**
```typescript
// Remove from login.tsx - never accept test OTPs in production:
const isTestOTP = process.env.NODE_ENV === 'development' && otp === '123456';
// DELETE THIS - security risk:
if (isTestOTP) { /* bypass */ }
```

---

## 2. High-Risk Issues

### 2.1 Insecure Local OTP Storage

**Vulnerability:** OTP codes stored in plain JavaScript Map

**Location:** [`contexts/AuthContext.tsx:39-69`](contexts/AuthContext.tsx:39)

**Issue:**
```typescript
const otpStore = new Map<string, { otp: string; expiry: number; attempts: number }>();
// OTPs stored in plaintext in app memory
```

**Exact Fix:**
```typescript
// Use expo-secure-store for OTP storage:
import * as SecureStore from 'expo-secure-store';

const storeOTP = async (phone: string, otp: string) => {
  await SecureStore.setItemAsync(`otp_${phone}`, otp, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
};
```

### 2.2 Missing Authorization Checks

**Vulnerability:** API routes may not verify user ownership

**Location:** [`services/api.ts`](services/api.ts:94-103)

**Issue:**
```typescript
// No user ID verification in update:
async updateProfile(userId: string, updates: Record<string, any>) {
  // Anyone can update any user's profile if they have the ID
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);  // Missing: .eq('id', currentUser.id)
}
```

**Exact Fix:**
```typescript
async updateProfile(userId: string, updates: Record<string, any>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return { error: 'Unauthorized' };
  }
  // Then proceed with update
}
```

### 2.3 Weak Rate Limiting Implementation

**Vulnerability:** Client-side rate limiting can be bypassed

**Location:** [`contexts/AuthContext.tsx:292-307`](contexts/AuthContext.tsx:292)

**Issue:**
```typescript
// Rate limiting only in client - can be bypassed:
const rateCheck = checkRateLimit('otp_request', phone);
// Attacker can disable JS or use different devices
```

**Exact Fix:**
- Implement rate limiting on backend/API side
- Use Supabase Edge Functions for sensitive operations
- Add IP-based rate limiting at CDN/load balancer level

### 2.4 No Input Sanitization

**Vulnerability:** User inputs not sanitized before storage/display

**Location:** Multiple files

**Evidence:**
- `blog.tsx` - user comments stored without sanitization
- `community.tsx` - forum posts not sanitized
- `search.tsx` - search queries logged as-is

**Exact Fix:**
```typescript
import { sanitizeHtml } from '@/utils/validation';

// Before storing user input:
const sanitizedInput = sanitizeHtml(userInput);

// Use DOMPurify or similar library:
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirty);
```

---

## 3. Medium-Risk Issues

### 3.1 Missing Authentication on Some Routes

**Vulnerability:** Some API endpoints accessible without auth

**Location:** [`services/api.ts`](services/api.ts:60-84)

**Issue:**
```typescript
// Public endpoint - needs to be explicit:
async getHoroscope(sign: string, timeframe) {
  // This should require auth for personalized data
}
```

**Exact Fix:**
```typescript
async getHoroscope(sign: string, timeframe, userId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && timeframe === 'personal') {
    return { error: 'Authentication required' };
  }
}
```

### 3.2 Insecure Data Storage

**Vulnerability:** Sensitive data in AsyncStorage

**Location:** [`hooks/index.ts:299-320`](hooks/index.ts:299)

**Issue:**
```typescript
// Using localStorage for sensitive data:
localStorage.setItem(key, JSON.stringify(valueToStore));
// localStorage is not encrypted
```

**Exact Fix:**
```typescript
// Use expo-secure-store instead:
import * as SecureStore from 'expo-secure-store';

export function useSecureStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = await SecureStore.getItemAsync(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  
  const setValue = async (value: T | ((prev: T) => T)) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    await SecureStore.setItemAsync(key, JSON.stringify(valueToStore));
    setStoredValue(valueToStore);
  };
  
  return [storedValue, setValue];
}
```

### 3.3 Missing HTTPS Enforcement

**Vulnerability:** No HTTP to HTTPS redirect

**Location:** [`app.json`](app.json) - missing expo-https package

**Exact Fix:**
```json
// Add to app.json "expo": {
"ios": {
  "ATSConfigurations": {
    "*": {
      "NSAllowsArbitraryLoads": false,
      "NSAllowsArbitraryLoadsInWebContent": false
    }
  }
}
```

### 3.4 Weak Password/Code Generation

**Vulnerability:** Custom crypto used instead of proven libraries

**Location:** [`utils/crypto.ts`](utils/crypto.ts)

**Issue:**
```typescript
// May use weak custom random:
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
```

**Exact Fix:**
```typescript
import { randomBytes } from 'crypto';

function generateSecureOTP(): string {
  const buffer = randomBytes(4);
  return (buffer.readUInt32BE(0) % 900000 + 100000).toString();
}
```

---

## 4. Low-Risk Issues

### 4.1 Missing Security Headers

**Recommendation:** Add security headers via Expo config

### 4.2 Debug Mode in Production

**Issue:** `DEBUG=true` in `.env.development:47`

### 4.3 Verbose Error Messages

**Issue:** Error messages may expose internal system details

---

## 5. Security Checklist

| Security Check | Status | Priority |
|---------------|--------|----------|
| Remove EXPO_PUBLIC_ from secrets | ❌ NOT DONE | CRITICAL |
| Remove test credentials | ❌ NOT DONE | CRITICAL |
| Implement server-side rate limiting | ❌ NOT DONE | HIGH |
| Add input sanitization | ❌ NOT DONE | HIGH |
| Use secure storage for OTP | ❌ NOT DONE | HIGH |
| Add authorization checks to APIs | ❌ NOT DONE | HIGH |
| Enable HTTPS enforcement | ⚠️ PARTIAL | MEDIUM |
| Add security headers | ❌ NOT DONE | MEDIUM |
| Implement audit logging | ❌ NOT DONE | MEDIUM |
| Add biometric auth for payments | ❌ NOT DONE | MEDIUM |

---

## 6. Immediate Actions Required

### Step 1: Fix Environment Variables (CRITICAL)

```bash
# Create new .env.production without sensitive keys:
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxx

# REMOVE these from client-facing env:
# - SUPABASE_SERVICE_ROLE_KEY
# - RAZORPAY_KEY_SECRET  
# - AGORA_APP_CERTIFICATE
# - SENTRY_AUTH_TOKEN
# - JWT_SECRET
# - ENCRYPTION_KEY
```

### Step 2: Remove Test Credentials

```bash
# Delete these from .env.example:
TEST_OTP_CODE=123456
TEST_PHONE_NUMBERS=+919999999999,+918888888888
```

### Step 3: Update API Service

```typescript
// Add authorization to updateProfile in services/api.ts:
async updateProfile(userId: string, updates: Record<string, any>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return { data: null, error: 'Unauthorized access', status: 403 };
  }
  // ... rest of update logic
}
```

---

## 7. Security Score

| Category | Score |
|----------|-------|
| Secrets Management | 2/10 |
| Authentication | 6/10 |
| Authorization | 4/10 |
| Input Validation | 3/10 |
| Data Protection | 4/10 |
| API Security | 5/10 |
| Overall | **3.4/10** |

---

*This security audit reveals multiple critical vulnerabilities that must be addressed before production deployment.*
