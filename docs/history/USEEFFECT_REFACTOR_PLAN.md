# useEffect Refactoring Plan - AstroNemi App

## 🎯 Executive Summary

This document outlines a comprehensive plan to refactor useEffect usage across the AstroNemi React Native application following modern React patterns while maintaining 100% functionality.

## 📊 Current State Analysis

### Total useEffect Count: ~50+ instances across the codebase

### Categories Identified:

1. **AsyncStorage Initialization** (15+ instances) - Loading data on mount
2. **AsyncStorage Persistence** (10+ instances) - Saving data on state change
3. **Derived State** (5+ instances) - Computing values from other state
4. **Timers/Intervals** (5+ instances) - Countdown timers, animations
5. **Event-Driven Logic** (5+ instances) - Reacting to prop/state changes
6. **External APIs** (10+ instances) - Native modules, animations, location

---

## 🔍 PHASE 1: CONTEXT FILES AUDIT

### 1.1 ThemeContext.tsx

#### 🔍 Problem Detected
```typescript
// ANTI-PATTERN: Derived state in useEffect
useEffect(() => {
  if (themeMode === 'system') {
    setIsDark(systemColorScheme === 'dark');
  } else {
    setIsDark(themeMode === 'dark');
  }
}, [themeMode, systemColorScheme]);
```

#### ✅ Refactored Code
```typescript
// ALREADY FIXED: Using useMemo for derived state
const isDark = useMemo(() => {
  if (themeMode === 'system') {
    return systemColorScheme === 'dark';
  }
  return themeMode === 'dark';
}, [themeMode, systemColorScheme]);
```

#### 💡 Reason
- Derived state should be computed directly, not stored in state
- useMemo prevents unnecessary recalculations
- Eliminates state synchronization bugs

#### ⚠️ Risk Level: **ALREADY FIXED** (Low risk - already implemented)

#### 🐛 Bug Found
```typescript
// BUG: setIsDark is called but isDark is now derived
useEffect(() => {
  if (themeMode === 'system') {
    setIsDark(systemColorScheme === 'dark'); // ❌ setIsDark doesn't exist
  }
}, [themeMode, systemColorScheme]);
```

**Fix Required**: Remove the redundant useEffect that calls non-existent setIsDark

---

### 1.2 CartContext.tsx

#### 🔍 Problem Detected #1
```typescript
// ANTI-PATTERN: Multiple useEffects for persistence
useEffect(() => {
  AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}, [items]);

useEffect(() => {
  AsyncStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(addresses));
}, [addresses]);

useEffect(() => {
  AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
}, [orders]);
```

#### ✅ Refactored Code
```typescript
// BETTER: Custom hook for batched persistence
const usePersist = <T,>(key: string, value: T, debounceMs = 500) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    // Debounce writes to prevent excessive AsyncStorage calls
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      AsyncStorage.setItem(key, JSON.stringify(value)).catch(console.error);
    }, debounceMs);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, value, debounceMs]);
};

// Usage in CartProvider
usePersist(CART_STORAGE_KEY, items);
usePersist(ADDRESSES_STORAGE_KEY, addresses);
usePersist(ORDERS_STORAGE_KEY, orders);
```

#### 💡 Reason
- Reduces code duplication
- Adds debouncing to prevent excessive writes
- Centralizes persistence logic
- Easier to test and maintain

#### ⚠️ Risk Level: **Medium**
- Changes timing of persistence (adds debounce)
- Need to ensure data is saved before app closes
- Test cart operations thoroughly

---

### 1.3 AuthContext.tsx

#### 🔍 Problem Detected
```typescript
// ACCEPTABLE: Initialization with demo user fallback
useEffect(() => {
  const loadUser = async () => {
    // Create demo user immediately
    const demoUser: User = { /* ... */ };
    setUser(demoUser);
    setIsAuthenticated(true);
    
    // Try to load real user in background
    // ...
  };
  loadUser();
}, [useSupabase, fetchUserProfile, loadUserFromStorage]);
```

#### ✅ Status: **KEEP AS-IS**

#### 💡 Reason
- This is a legitimate use of useEffect for initialization
- The pattern (immediate demo user + background load) is intentional for UX
- Dependencies are stable (useSupabase is boolean, others are useCallback)

#### ⚠️ Risk Level: **Low** - Already audited and marked as safe

#### 🔧 Minor Improvement
```typescript
// Remove unused imports
- import { useState, useEffect, useCallback, useRef } from 'react';
+ import { useState, useEffect, useCallback } from 'react';

- import AsyncStorage from '@react-native-async-storage/async-storage';
// (Not used - secure-storage is used instead)
```

---

### 1.4 UserContext.tsx

#### 🔍 Problem Detected #1
```typescript
// ANTI-PATTERN: Event-driven side effect
useEffect(() => {
  if (!isLoading) {
    initializeNotifications(notificationSettings, user?.name || 'User')
      .catch(console.error);
  }
}, [notificationSettings, user, isLoading]);
```

#### ✅ Refactored Code
```typescript
// BETTER: Call directly when settings change
const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
  const updated = { ...notificationSettings, ...settings };
  setNotificationSettings(updated);
  await AsyncStorage.setItem('notificationSettings', JSON.stringify(updated));
  
  // Initialize notifications immediately after update
  await initializeNotifications(updated, user?.name || 'User');
};
```

#### 💡 Reason
- Side effects should be triggered by user actions, not state changes
- More predictable and easier to debug
- Reduces unnecessary re-initializations

#### ⚠️ Risk Level: **Medium**
- Need to ensure notifications are initialized on mount
- May need a separate initialization call in loadUserData

---

### 1.5 AppContext.tsx

#### 🔍 Problem Detected
```typescript
// ISSUE: saveWallet and saveProfile not wrapped in useCallback
const addMoney = useCallback((amount: number) => {
  // ...
  saveWallet({ balance: newBalance, transactions: newTransactions });
}, [walletBalance, transactions, saveWallet]); // ❌ saveWallet changes every render
```

#### ✅ Refactored Code
```typescript
const saveWallet = useCallback(async (data: { balance: number; transactions: Transaction[] }) => {
  try {
    await AsyncStorage.setItem('wallet', JSON.stringify(data));
    setWalletBalance(data.balance);
    setTransactions(data.transactions);
  } catch (error) {
    console.error('Error saving wallet data:', error);
  }
}, []);

const saveProfile = useCallback(async (profile: UserProfile) => {
  try {
    await AsyncStorage.setItem('profile', JSON.stringify(profile));
    setUserProfile(profile);
  } catch (error) {
    console.error('Error saving profile data:', error);
  }
}, []);
```

#### 💡 Reason
- Prevents infinite re-render loops
- Stabilizes dependencies for other useCallbacks
- Follows React best practices

#### ⚠️ Risk Level: **Low** - Simple fix, no behavior change

---

### 1.6 LanguageContext.tsx

#### ✅ Status: **KEEP AS-IS**

```typescript
// ACCEPTABLE: Initialization from AsyncStorage
useEffect(() => {
  const loadLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLang && savedLang in LANGUAGES) {
        setLanguageState(savedLang as LanguageCode);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };
  loadLanguage().catch(console.error);
}, []);
```

#### 💡 Reason
- Legitimate initialization pattern
- No dependencies, runs once on mount
- Already non-blocking (background load)

#### ⚠️ Risk Level: **Low** - Already audited and safe

---

## 🔍 PHASE 2: COMPONENT FILES AUDIT

### 2.1 LocationPicker.tsx

#### 🔍 Problem Detected
```typescript
// ANTI-PATTERN: Reset on prop change
useEffect(() => {
  if (visible) {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedLocation(null);
  }
}, [visible]);
```

#### ✅ Refactored Code - Option 1: Key Prop
```typescript
// BEST: Remount component when visible changes
<LocationPicker key={visible ? 'open' : 'closed'} visible={visible} />
```

#### ✅ Refactored Code - Option 2: Direct Reset
```typescript
// GOOD: Reset in the function that opens the modal
const openLocationPicker = () => {
  setSearchQuery('');
  setSearchResults([]);
  setSelectedLocation(null);
  setVisible(true);
};
```

#### 💡 Reason
- Avoids unnecessary useEffect
- More explicit and predictable
- Easier to understand control flow

#### ⚠️ Risk Level: **Low** - Simple refactor, clear improvement

---

### 2.2 app/index.tsx

#### ✅ Status: **KEEP AS-IS**

```typescript
// ACCEPTABLE: Initialization with navigation
useEffect(() => {
  const checkOnboarding = async () => {
    try {
      const completed = await AsyncStorage.getItem('onboarding_completed');
      if (completed) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    } catch {
      router.replace('/onboarding');
    }
  };
  
  setTimeout(() => checkOnboarding(), 100);
}, []);
```

#### 💡 Reason
- Legitimate initialization pattern for routing
- Needs to run after component mounts
- Already optimized with minimal delay

#### ⚠️ Risk Level: **Low** - Already audited and safe

---

### 2.3 Timer/Animation Components

#### Files Affected:
- `app/meditation.tsx` - Meditation timer
- `app/video-consultation/[id].tsx` - Call duration timer
- `app/login.tsx` - OTP countdown, animations
- `components/SkeletonLoader.tsx` - Shimmer animation

#### ✅ Status: **KEEP AS-IS**

```typescript
// ACCEPTABLE: Timer intervals
useEffect(() => {
  let interval: number | undefined;
  if (isTimerRunning && timer > 0) {
    interval = setInterval(() => setTimer(t => t - 1), 1000);
  }
  return () => clearInterval(interval);
}, [isTimerRunning, timer]);
```

#### 💡 Reason
- Timers and animations REQUIRE useEffect
- Cannot be replaced with derived state
- Already properly cleaned up

#### ⚠️ Risk Level: **None** - Correct usage

---

## 📋 REFACTORING PRIORITY

### Priority 1: Critical Fixes (Do First)
1. ✅ **ThemeContext.tsx** - Remove redundant useEffect with setIsDark
2. ✅ **AppContext.tsx** - Wrap saveWallet/saveProfile in useCallback
3. ✅ **AuthContext.tsx** - Remove unused imports

### Priority 2: Performance Improvements (Do Second)
4. **CartContext.tsx** - Create usePersist hook for debounced persistence
5. **UserContext.tsx** - Move notification initialization to direct calls

### Priority 3: Code Quality (Do Third)
6. **LocationPicker.tsx** - Replace useEffect with key prop or direct reset
7. **Create custom hooks** - Extract common patterns

### Priority 4: Documentation (Do Last)
8. **Add comments** - Mark all remaining useEffects as audited
9. **Update tests** - Ensure all refactors are covered

---

## 🛠️ CUSTOM HOOKS TO CREATE

### 1. usePersist Hook
```typescript
// hooks/usePersist.ts
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function usePersist<T>(key: string, value: T, debounceMs = 500) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      AsyncStorage.setItem(key, JSON.stringify(value)).catch(console.error);
    }, debounceMs);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, value, debounceMs]);
}
```

### 2. useAsyncStorage Hook
```typescript
// hooks/useAsyncStorage.ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAsyncStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    AsyncStorage.getItem(key)
      .then(stored => {
        if (stored) {
          setValue(JSON.parse(stored));
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [key]);
  
  const updateValue = useCallback(async (newValue: T) => {
    setValue(newValue);
    await AsyncStorage.setItem(key, JSON.stringify(newValue));
  }, [key]);
  
  return [value, updateValue, isLoading] as const;
}
```

---

## 📊 METRICS

### Before Refactoring:
- Total useEffect: ~50+
- Unnecessary useEffect: ~10
- Performance issues: 3 (frequent AsyncStorage writes)
- Bugs: 1 (ThemeContext setIsDark)

### After Refactoring (Target):
- Total useEffect: ~40
- All useEffect: Audited and documented
- Performance issues: 0
- Bugs: 0

---

## ✅ VERIFICATION CHECKLIST

After each refactor:
- [ ] App loads without errors
- [ ] All screens render correctly
- [ ] State updates work as expected
- [ ] AsyncStorage persistence works
- [ ] No infinite loops
- [ ] No memory leaks
- [ ] TypeScript compiles without errors
- [ ] Tests pass (if applicable)

---

## 🚀 IMPLEMENTATION PLAN

### Week 1: Critical Fixes
- Day 1: Fix ThemeContext bug
- Day 2: Fix AppContext useCallback issues
- Day 3: Clean up unused imports
- Day 4-5: Testing and verification

### Week 2: Performance Improvements
- Day 1-2: Create usePersist hook
- Day 3: Refactor CartContext
- Day 4: Refactor UserContext
- Day 5: Testing and verification

### Week 3: Code Quality
- Day 1: Refactor LocationPicker
- Day 2: Create useAsyncStorage hook
- Day 3-4: Apply to remaining components
- Day 5: Final testing

### Week 4: Documentation & Polish
- Day 1-2: Add audit comments to all useEffects
- Day 3-4: Update documentation
- Day 5: Final review and sign-off

---

## 📝 NOTES

- All changes should be made incrementally
- Each change should be tested before moving to the next
- Keep git commits small and focused
- Document any breaking changes
- Update tests as needed

---

**Status**: Ready for implementation
**Last Updated**: 2026-03-19
**Reviewed By**: Senior React Architect
