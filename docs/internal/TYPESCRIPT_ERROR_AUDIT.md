# TypeScript Error Analysis & Corrective Action Plan

**Generated:** April 21, 2026  
**Real Error Count:** 379 errors (not 453)  
**Status:** Ready for systematic fix

---

## 📊 ACTUAL ERROR BREAKDOWN

### By Error Type (Top 15)
| Error Code | Count | Category | Meaning |
|-----------|-------|----------|---------|
| TS6133 | 65 | **Unused Code** | Variable/Import declared but never read |
| TS2339 | 54 | **Missing Properties** | Property does not exist on type |
| TS2322 | 46 | **Type Mismatch** | Type 'X' is not assignable to type 'Y' |
| TS2305 | 30 | **Import/Module** | Cannot find module or namespace export |
| TS18048 | 27 | **Null Safety** | Variable is possibly undefined |
| TS2532 | 27 | **Null Safety** | Object is possibly undefined |
| TS2345 | 26 | **Function Args** | Argument of type 'X' is not assignable |
| TS2304 | 18 | **Name Resolution** | Cannot find name 'X' |
| TS2722 | 11 | **This Binding** | Cannot invoke an object that has no call signature |
| TS2551 | 10 | **Property Typos** | Property does not exist on type (did you mean?) |
| TS2531 | 9 | **Null Check** | Object is possibly null |
| TS2307 | 5 | **Module not found** | Cannot find module |
| TS7017 | 4 | **Index/Key Access** | Element implicitly has 'any' type |
| TS6196 | 4 | **Any Type** | Duplicate key in template |
| TS18046 | 4 | **Null Safety** | Value is possibly null or undefined |

**Total Errors Accounted For:** 379 ✓

---

## 🔥 CRITICAL FILES (Top 10 Most Errors)

| File | Error Count | Primary Issues | Error Codes |
|------|-------------|-----------------|------------|
| utils/prokerala-api.ts | 36 | Type mismatches, missing definitions | TS2322, TS2305 |
| services/video-call.ts | 26 | Unused imports, type mismatches | TS6133, TS2322 |
| utils/free-astrology-api.ts | 18 | Missing imports, type issues | TS2305, TS2322 |
| utils/index.ts | 18 | Missing properties, wrong types | TS2339, TS2322 |
| types/index.ts | 13 | Unused code, type issues | TS6133, TS2339 |
| app/remedies.tsx | 13 | Unused imports, undefined checks | TS6133, TS18048 |
| mocks/horoscopes.ts | 10 | Property issues, unused code | TS2339, TS6133 |
| utils/astrology-remedies.ts | 10 | Type mismatches, unused | TS2322, TS6133 |
| utils/__tests__/kp-engine.test.ts | 9 | Wrong argument types | TS2345, TS2339 |
| components/kundli/KundliSadeSati.tsx | 8 | Type mismatches, undefined | TS2322, TS18048 |

---

## 🎯 CATEGORIZED PRIORITY BREAKDOWN

### PHASE 1: Low-Hanging Fruit (Remove Unused Code)
**Error Count:** ~65 (TS6133)  
**Impact:** High (Quick wins)  
**Time Estimate:** 1-2 hours

**Action Items:**
- Remove unused imports across entire codebase
- Delete unused variables and function declarations
- Clean up dead code in test files

**Primary Files:**
- services/video-call.ts
- types/index.ts  
- app/remedies.tsx
- mocks/horoscopes.ts

---

### PHASE 2: API Layer Fixes (APIs Missing Type Definitions)
**Error Count:** ~72 (TS2305, TS2322, TS2345)  
**Impact:** Critical (Core functionality)  
**Time Estimate:** 2-3 hours

**Primary Files:**
1. **utils/prokerala-api.ts** (36 errors)
   - Missing response type definitions
   - Incorrect argument types
   - Import/export mismatches

2. **utils/free-astrology-api.ts** (18 errors)
   - Missing fallback API types
   - Type assertion issues

3. **utils/vedastro-api.ts** (8 errors)
   - Vedic calculation type mismatches

4. **services/api.ts** (6 errors)
   - Service layer type definitions

**Fix Strategy:**
```typescript
// Define proper API response interfaces
interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  message?: string;
}

// Properly type external API calls
interface ProkeralaKundliResponse {
  success: boolean;
  data?: {
    planets: Array<{
      name: string;
      longitude: number;
      latitude: number;
      // ... add all required fields
    }>;
  };
  error?: string;
}
```

---

### PHASE 3: Missing Properties & Type Definition Issues
**Error Count:** ~54 (TS2339, TS2551)  
**Impact:** High (Common component issues)  
**Time Estimate:** 2-3 hours

**Approach:**
- Audit type definitions in types/index.ts
- Add missing properties to interfaces
- Fix typos in property access (TS2551 = "Did you mean?" errors)

**Top Files:**
- types/index.ts (13 errors)
- mocks/horoscopes.ts (10 errors)
- app/remedies.tsx (via components)

---

### PHASE 4: Type Mismatch Fixes
**Error Count:** ~46 (TS2322)  
**Impact:** High (Type safety)  
**Time Estimate:** 2-3 hours

**Common Patterns:**
- Array vs single value type mismatches
- Optional vs required field issues
- Wrong generic type arguments

**Example Fix:**
```typescript
// Before
const astrologers: UiAstrologer[] | Astrologer[] = data;
// After
const astrologers: UiAstrologer[] = data.map(astrologer => 
  // transform if needed
);
```

---

### PHASE 5: Null Safety Fixes (The "Possibly" Issues)
**Error Count:** ~54 (TS18048, TS2532, TS2531)  
**Impact:** Medium (Runtime safety)  
**Time Estimate:** 2-3 hours

**Patterns:**
- TS18048: Variable possibly undefined
- TS2532: Object possibly undefined
- TS2531: Object possibly null

**Fix Strategy:**
```typescript
// Before
const value = data.property.subProperty; // TS18048 error

// After - Option 1: Optional chaining
const value = data?.property?.subProperty;

// After - Option 2: Guard clause
if (data?.property?.subProperty) {
  const value = data.property.subProperty;
}

// After - Option 3: Nullish coalescing
const value = data?.property?.subProperty ?? defaultValue;
```

---

### PHASE 6: Function Arguments & Compatibility
**Error Count:** ~37 (TS2345, TS2722, TS2769)  
**Impact:** Medium (Function call safety)  
**Time Estimate:** 1.5-2 hours

**Issues:**
- Wrong argument types passed to functions
- Callback signature mismatches
- Generic type parameter mismatches

---

### PHASE 7: Module & Import Resolution
**Error Count:** ~53 (TS2305, TS2304, TS2307)  
**Impact:** Medium (Build dependencies)  
**Time Estimate:** 1-2 hours

**Issues:**
- Cannot find module (missing dependency/export)
- Cannot find name (missing import or declaration)
- Circular dependencies or barrel file issues

---

### PHASE 8: Final Cleanup
**Error Count:** ~18 (Various)  
**Impact:** Low (Edge cases)  
**Time Estimate:** 1 hour

**Issues:**
- Template literal issues
- Index signature problems
- Misc type assertions

---

## 📋 EXECUTION ROADMAP

### Day 1 (Phase 1 + Phase 2)
- **Morning:** Remove all unused imports/variables (TS6133 = 65 errors)
- **Afternoon:** Fix major API type definitions (prokerala-api.ts)

### Day 2 (Phase 3 + Phase 4)
- **Morning:** Fix missing properties in types
- **Afternoon:** Fix type mismatches across API layer

### Day 3 (Phase 5 + Phase 6)
- **Morning:** Add null safety checks
- **Afternoon:** Fix function arguments

### Day 4 (Phase 7 + Phase 8)
- **Morning:** Resolve module imports
- **Afternoon:** Final edge cases and verification

---

## ✅ VERIFICATION CHECKLIST

After each phase:
- [ ] Run `npx tsc --noEmit` to verify error count
- [ ] No new errors introduced
- [ ] Build succeeds: `npx expo build:web`
- [ ] Core functionality tests pass

Final validation:
- [ ] Error count: 0
- [ ] No warnings in build
- [ ] All imports properly typed
- [ ] All components render without warnings

---

## 🔧 STARTING WITH TOP 3 FILES

### 1. utils/prokerala-api.ts (36 errors)
**Quick wins:**
- Define ProkeralaResponse interface
- Type all API methods with proper return types
- Remove unused variables

### 2. services/video-call.ts (26 errors)
**Quick wins:**
- Remove unused imports (likely 20+ TS6133 errors)
- Type Agora SDK calls properly
- Fix callback signatures

### 3. utils/free-astrology-api.ts (18 errors)
**Quick wins:**
- Add fallback API type definitions
- Fix import resolution issues
- Type transform functions

---

## 📊 SUMMARY

| Metric | Value |
|--------|-------|
| **Total Errors** | 379 |
| **Unused Code (TS6133)** | 65 |
| **Property Issues (TS2339)** | 54 |
| **Type Mismatches (TS2322)** | 46 |
| **Module Issues (TS2305/2304/2307)** | 53 |
| **Null Safety Issues (TS18048/2532/2531)** | 63 |
| **Estimated Fix Time** | 8-10 hours |
| **Recommended Approach** | Start with Phase 1 (quick wins) |

