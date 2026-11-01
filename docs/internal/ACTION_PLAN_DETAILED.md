# TypeScript Error Fix - Detailed Action Plan

## Quick Reference: Error Code Meanings

| Code | Meaning | Common Fix |
|------|---------|-----------|
| **TS6133** | declared but never read | Remove unused import/variable |
| **TS2339** | property does not exist | Add property to interface or fix typo |
| **TS2322** | type mismatch | Change variable type or cast correctly |
| **TS2305** | module/export not found | Check import path or add export |
| **TS18048** | variable possibly undefined | Use optional chaining `?.` or guard clause |
| **TS2532** | object possibly undefined | Add null check |
| **TS2345** | wrong argument type | Fix function call arguments |
| **TS2304** | cannot find name | Add import or declare variable |

---

## PHASE 1: Remove Unused Imports (65 TS6133 errors) ⚡

### Step 1.1: services/video-call.ts
```bash
# Expected to fix ~10-15 TS6133 errors
```
**What to do:**
1. Open the file
2. Look at the imports at the top
3. For each import, check if it's actually used in the code
4. Delete unused imports

**Example:**
```typescript
// BEFORE - Remove if never used
import { ShieldAlert } from 'lucide-react';
import { AppTheme } from '@/contexts/ThemeContext';
import axios from 'axios';

// AFTER - Only keep what's used
import { useCallback } from 'react';
```

### Step 1.2: types/index.ts
**What to do:**
1. Review exported types
2. Check which ones are actually imported elsewhere
3. Use `grep` to find usages
4. Remove exports that aren't used

### Step 1.3: app/remedies.tsx & mocks/horoscopes.ts
**Quick scan strategy:**
- Remove imports with strikethrough lines (VSCode shows these)
- Search for each import name using Ctrl+Shift+F
- If 0 results, delete the import

**Expected result:** Reduce error count by ~65

---

## PHASE 2: Fix API Types (36 + 18 + 8 errors in 3 API files)

### Step 2.1: utils/prokerala-api.ts (36 errors)

**Get the file first:**
```bash
# View the current state
type cat utils/prokerala-api.ts | head -50
```

**Common fixes needed:**
1. Add response type definitions
2. Remove `any` types
3. Fix function return types
4. Type API parameters correctly

**Template to add to top of file:**
```typescript
// Add these interface definitions at the top
interface ProkeralaResponse<T> {
  success: boolean;
  data?: T;
  error?: string | null;
}

interface PlanetPosition {
  name: string;
  longitude: number;
  latitude: number;
  speed: number;
  sign: string;
  house: number;
  nakshatra: string;
  pada: number;
}

interface KundliData {
  planets: PlanetPosition[];
  houses: Array<{ number: number; sign: string }>;
  ascendant: string;
  // Add other required fields
}

// Type all API calls
async function getKundli(birth: BirthData): Promise<KundliData> {
  // Instead of: async function getKundli(birth: any): Promise<any>
}
```

**Specific errors in this file:**
- Line with `any` type → Replace with specific interface
- Missing import → Add to imports
- Wrong return type → Update function signature

### Step 2.2: utils/free-astrology-api.ts (18 errors)
**Similar approach:**
- Define FreeAstrologyResponse interface
- Type all fallback API calls
- Remove any/unknown types

### Step 2.3: utils/vedastro-api.ts (8 errors)
**Similar approach:**
- Define VedastroResponse interface
- Type vedic-specific calculations

**Expected result:** Fix 62 errors

---

## PHASE 3: Fix Missing Properties (54 TS2339 + 10 TS2551 errors)

### Step 3.1: types/index.ts - Audit Interfaces
**What to do:**
1. Open types/index.ts
2. For each interface used in components:
   - Check if all properties are defined
   - Look for "Did you mean?" suggestions in errors
   - Add missing optional properties

**Example audit:**
```typescript
// BEFORE - Missing properties
interface Astrologer {
  name: string;
  id: string;
}

// AFTER - Add missing properties from actual usage
interface Astrologer {
  name: string;
  id: string;
  consultations?: number;  // ← Was accessing this
  isAvailable?: boolean;    // ← Was accessing this
  bio?: string;             // ← Was accessing this
  availableFrom?: string;   // ← Was accessing this
}
```

### Step 3.2: Check mocks/horoscopes.ts
**Issue:** Mock data missing properties that real data has
**Fix:** Add all properties used by components

**Expected result:** Fix 64 errors

---

## PHASE 4: Type Mismatches (46 TS2322 errors)

### Common Patterns:

**Pattern 1: Array vs Single Value**
```typescript
// BEFORE TS2322
const data: UiAstrologer[] | Astrologer[] = apiResponse;

// AFTER - Map to correct type
const data: UiAstrologer[] = apiResponse.map(item => ({
  ...item,
  consultations: item.consultations ?? 0,
}));
```

**Pattern 2: Optional vs Required**
```typescript
// BEFORE TS2322
const value: string = data?.property; // possibly undefined!

// AFTER - Option 1: Make type optional
const value: string | undefined = data?.property;

// AFTER - Option 2: Provide default
const value: string = data?.property ?? '';

// AFTER - Option 3: Guard clause
if (data?.property) {
  const value: string = data.property;
}
```

**Pattern 3: Generic Type Mismatch**
```typescript
// BEFORE
type Consultation = { id: string };
const data: RawConsultationData[] = consultations; // TS2322

// AFTER - Cast if intentional
const data = consultations as unknown as RawConsultationData[];
// OR - Map to correct type
const data = consultations.map(c => ({ ...c, createdAt: c.createdAt.toString() }));
```

**Expected result:** Fix 46 errors

---

## PHASE 5: Null Safety (54 errors across TS18048, TS2532, TS2531)

### Quick Pattern Fixes:

```typescript
// TS18048: possibly undefined
const value = data.property.subProperty; // Error: data.property might not exist

// FIX: Use optional chaining
const value = data?.property?.subProperty;

// OR: Guard clause
if (data && data.property) {
  const value = data.property.subProperty;
}

// OR: Nullish coalescing
const value = data?.property?.subProperty ?? 'default';
```

**Files to focus on:**
1. app/numerology.tsx - Many undefined array/string issues
2. app/remedies.tsx - Missing null checks
3. components/kundli/KundliSadeSati.tsx - Potentially undefined properties

**Expected result:** Fix 54 errors

---

## PHASE 6: Module/Import Issues (53 TS2305, TS2304, TS2307)

### Common causes:
1. **Wrong import path**
   ```typescript
   // WRONG
   import { Something } from 'some/wrong/path';
   
   // RIGHT - Check tsconfig.json for path mappings
   import { Something } from '@/utils/module';
   ```

2. **Missing export in barrel file**
   ```typescript
   // If importing from utils/index.ts:
   // Make sure utils/index.ts exports it:
   export * from './some-module';
   ```

3. **Circular dependency**
   - A imports B, B imports A
   - Fix by moving shared code to common file

**Expected result:** Fix 53 errors

---

## Detailed File-by-File Action List

### HIGH PRIORITY (Start Here)
1. **utils/prokerala-api.ts**
   - Add 5-10 response interfaces
   - Replace all `any` with specific types
   - Fix import statements

2. **services/video-call.ts**
   - Delete unused imports (quick fix)
   - Type Agora SDK calls
   - Fix callback signatures

3. **utils/free-astrology-api.ts**
   - Add API response interfaces
   - Fix import paths

### MEDIUM PRIORITY  
4. **types/index.ts**
   - Remove unused exports
   - Add missing properties to interfaces

5. **app/remedies.tsx**
   - Remove unused imports
   - Add null checks

6. **utils/index.ts**
   - Check all exports exist
   - Fix re-export statements

### REFERENCE COMMANDS

**To see all errors in a file:**
```bash
npx tsc --noEmit 2>&1 | Select-String "utils/prokerala-api"
```

**To see specific error type:**
```bash
npx tsc --noEmit 2>&1 | Select-String "TS2322"
```

**To check if file compiles:**
```bash
npx tsc --noEmit --skipLibCheck utils/prokerala-api.ts
```

---

## Success Criteria

✅ After each fix:
- Run: `npx tsc --noEmit 2>&1 | Select-String "error TS" | Measure-Object`
- Error count should decrease
- No new errors introduced

✅ Final state:
- Error count: 0
- Build succeeds: `npx expo build:web --no-cache`
- No console warnings about missing types

