# Type Consolidation Migration Guide

## Overview

This guide provides step-by-step instructions for migrating from the old scattered type definitions to the new consolidated type system in AstroNemi.

## New Type Organization

### Directory Structure
```
types/
├── entities/           # Core business entities
│   ├── user.ts        # User, UserProfile, BirthDetails, etc.
│   ├── astrologer.ts  # Astrologer, AstrologerCard, etc.
│   ├── consultation.ts # Consultation, ChatMessage, etc.
│   ├── transaction.ts # WalletTransaction, PaymentOrder, etc.
│   └── index.ts       # Entity exports
├── api/               # API-related types
│   ├── requests.ts    # Request payload types
│   ├── responses.ts   # Response wrapper types
│   └── index.ts       # API exports
├── components/        # Component prop types
│   ├── common.ts      # Button, Card, Input, etc.
│   └── index.ts       # Component exports
├── hooks/            # Hook-related types
│   ├── common.ts      # AsyncState, QueryState, etc.
│   └── index.ts       # Hook exports
└── index.ts          # Main export file
```

## Migration Steps

### Step 1: Update Imports

#### Before (Old scattered imports):
```typescript
// Multiple import sources
import { User } from '@/types/user';
import { Astrologer } from '@/types/api';
import { Consultation } from '@/hooks/queries/useUserProfile';
import { ChatMessage } from '@/services/ai-chatbot-service';
```

#### After (Consolidated imports):
```typescript
// Single import source
import { 
  User, 
  UserProfile, 
  Astrologer, 
  AstrologerCard,
  Consultation, 
  ConsultationDetails,
  ChatMessage,
  ChatMessageDetails 
} from '@/types';

// Or specific module imports
import { User, UserProfile } from '@/types/entities';
import { ApiResponse, PaginatedResponse } from '@/types/api';
```

### Step 2: Replace Duplicate Type Definitions

#### User Types Migration

**Old definitions to remove:**
- `hooks/queries/useUserProfile.ts` → `UserProfile` interface
- `types/user.ts` → `UserProfile` interface  
- `types/api.ts` → `User` interface

**New consolidated type:**
```typescript
import { User, UserProfile, BirthDetails } from '@/types/entities';

// Use the consolidated types
const user: User = await getUserById(id);
const profile: UserProfile = await getUserProfile(id);
```

#### Astrologer Types Migration

**Old definitions to remove:**
- `app/astrologer/[id].tsx` → `DbAstrologer` type alias
- `app/booking/[id].tsx` → `DbAstrologer` type alias
- `types/api.ts` → `Astrologer` interface

**New consolidated type:**
```typescript
import { Astrologer, AstrologerCard, AstrologerProfile } from '@/types/entities';

// Replace type aliases
// OLD: type DbAstrologer = Database['public']['Tables']['astrologers']['Row'];
// NEW: Use Astrologer directly

const astrologer: Astrologer = await getAstrologerById(id);
const astrologerCard: AstrologerCard = transformToCard(astrologer);
```

#### Consultation Types Migration

**Old definitions to remove:**
- `hooks/queries/useConsultationHistory.ts` → `Consultation` interface
- `hooks/queries/useUserProfile.ts` → `Consultation` interface
- `types/api.ts` → `Consultation` interface

**New consolidated type:**
```typescript
import { 
  Consultation, 
  ConsultationDetails, 
  ConsultationSummary,
  ChatMessage,
  ChatMessageDetails 
} from '@/types/entities';

// Use appropriate type based on context
const consultation: Consultation = await getConsultation(id);
const consultationWithDetails: ConsultationDetails = await getConsultationWithDetails(id);
const consultationSummary: ConsultationSummary = transformToSummary(consultation);
```

#### Transaction Types Migration

**Old definitions to remove:**
- `hooks/queries/useTransactions.ts` → `Transaction` interface
- `hooks/queries/useUserProfile.ts` → `WalletTransaction` interface

**New consolidated type:**
```typescript
import { 
  WalletTransaction, 
  TransactionDetails, 
  TransactionSummary,
  WalletInfo 
} from '@/types/entities';

// Use appropriate type based on context
const transaction: WalletTransaction = await getTransaction(id);
const transactionDetails: TransactionDetails = transformToDetails(transaction);
```

### Step 3: Update Component Props

#### Before (Scattered prop definitions):
```typescript
// In multiple component files
interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  // ... other props
}
```

#### After (Consolidated component types):
```typescript
import { ButtonProps, CardProps, InputProps } from '@/types/components';

// Use standardized component props
const MyButton: React.FC<ButtonProps> = ({ title, onPress, variant, ...props }) => {
  // Component implementation
};
```

### Step 4: Update Hook Types

#### Before (Custom hook state types):
```typescript
// In hook files
interface UseAsyncState<T> {
  loading: boolean;
  error: Error | null;
  data: T | null;
}
```

#### After (Consolidated hook types):
```typescript
import { AsyncState, QueryState, MutationState } from '@/types/hooks';

// Use standardized hook state types
function useCustomQuery<T>(): QueryState<T> {
  // Hook implementation
}
```

### Step 5: Update API Types

#### Before (Inconsistent API responses):
```typescript
// Different response structures
interface ApiResponse<T> { /* ... */ }
interface Response<T> { /* ... */ }
interface ServiceResponse<T> { /* ... */ }
```

#### After (Standardized API types):
```typescript
import { ApiResponse, PaginatedResponse, ApiError } from '@/types/api';

// Use consistent API response types
async function fetchUsers(): Promise<ApiResponse<User[]>> {
  // API call implementation
}

async function searchAstrologers(params: AstrologerFilters): Promise<PaginatedResponse<AstrologerCard>> {
  // API call implementation
}
```

## File-by-File Migration Checklist

### High Priority Files (Start Here)

#### 1. `hooks/queries/useUserProfile.ts`
- [ ] Replace local `UserProfile` interface with `import { UserProfile } from '@/types/entities'`
- [ ] Replace local `Consultation` interface with `import { Consultation } from '@/types/entities'`
- [ ] Replace local `WalletTransaction` interface with `import { WalletTransaction } from '@/types/entities'`
- [ ] Update function return types to use consolidated types

#### 2. `hooks/queries/useConsultationHistory.ts`
- [ ] Replace local `Consultation` interface with `import { ConsultationSummary } from '@/types/entities'`
- [ ] Update mapping logic to match new type structure

#### 3. `hooks/queries/useTransactions.ts`
- [ ] Replace local `Transaction` interface with `import { TransactionSummary } from '@/types/entities'`
- [ ] Update mapping logic to match new type structure

#### 4. `hooks/useAIChat.ts`
- [ ] Replace local `ChatMessage` interface with `import { ChatMessage } from '@/types/entities'`
- [ ] Note: May need to create AI-specific message type if structure differs significantly

#### 5. `app/astrologer/[id].tsx`
- [ ] Remove `type DbAstrologer = Database['public']['Tables']['astrologers']['Row']`
- [ ] Replace with `import { Astrologer } from '@/types/entities'`
- [ ] Update all `DbAstrologer` references to `Astrologer`

#### 6. `app/booking/[id].tsx`
- [ ] Remove `type DbAstrologer = Database['public']['Tables']['astrologers']['Row']`
- [ ] Replace with `import { Astrologer } from '@/types/entities'`
- [ ] Update all `DbAstrologer` references to `Astrologer`

#### 7. `app/search.tsx`
- [ ] Remove `type DbAstrologer = Database['public']['Tables']['astrologers']['Row']`
- [ ] Replace with `import { AstrologerCard } from '@/types/entities'`
- [ ] Update search result types

### Medium Priority Files

#### 8. `components/Button.tsx`
- [ ] Replace local type definitions with `import { ButtonProps, ButtonVariant, ButtonSize } from '@/types/components'`

#### 9. `components/Card.tsx`
- [ ] Replace local type definitions with `import { CardProps, CardHeaderProps } from '@/types/components'`

#### 10. `components/AstrologerCard.tsx`
- [ ] Update prop types to use `import { AstrologerCard } from '@/types/entities'`

### Low Priority Files

#### 11. Service files (`services/*.ts`)
- [ ] Update to use consolidated API types
- [ ] Replace custom response types with standardized ones

#### 12. Utility files (`utils/*.ts`)
- [ ] Update type imports as needed
- [ ] Ensure compatibility with new type structure

## Validation Steps

### 1. TypeScript Compilation
```bash
# Ensure no TypeScript errors
npx tsc --noEmit
```

### 2. Import Resolution
```bash
# Check for missing imports
npm run lint
```

### 3. Runtime Testing
- [ ] Test user profile loading
- [ ] Test astrologer listing and details
- [ ] Test consultation flow
- [ ] Test transaction history
- [ ] Test chat functionality

### 4. Type Safety Verification
- [ ] Verify IntelliSense works correctly
- [ ] Check for any `any` types that should be typed
- [ ] Ensure proper type inference in components

## Common Migration Issues

### Issue 1: Field Name Mismatches
**Problem:** Database fields use `snake_case`, API responses might use `camelCase`

**Solution:** Use type transformers or create separate API response types
```typescript
// Transform database type to API response
function transformUserToProfile(user: User): UserProfile {
  return {
    ...user,
    displayName: user.name || 'Anonymous',
    avatarUrl: user.avatar_url,
    // ... other transformations
  };
}
```

### Issue 2: Optional vs Required Fields
**Problem:** Different contexts require different field optionality

**Solution:** Use utility types to modify field requirements
```typescript
// Make certain fields required for API responses
type UserApiResponse = Required<Pick<User, 'id' | 'name'>> & Partial<User>;

// Make all fields optional for updates
type UserUpdatePayload = Partial<User>;
```

### Issue 3: Circular Dependencies
**Problem:** Types referencing each other causing import cycles

**Solution:** Move shared types to a common module or use forward declarations
```typescript
// In types/entities/common.ts
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// Use in other entity types
export interface User extends BaseEntity {
  // ... user-specific fields
}
```

## Rollback Plan

If issues arise during migration:

1. **Immediate Rollback:** Revert to previous commit
2. **Partial Rollback:** Keep new types but restore old imports temporarily
3. **Gradual Migration:** Migrate one file at a time instead of bulk changes

## Testing Strategy

### Unit Tests
- [ ] Update test files to use new types
- [ ] Verify mock data matches new type structures
- [ ] Test type transformations and mappings

### Integration Tests
- [ ] Test API integration with new response types
- [ ] Verify database queries return correct types
- [ ] Test component rendering with new prop types

### Type Tests
```typescript
// Create type tests to ensure compatibility
import { User, UserProfile } from '@/types/entities';

// Type assertion tests
const user: User = {} as User;
const profile: UserProfile = {} as UserProfile;

// Ensure User can be assigned to UserProfile base
const profileFromUser: UserProfile = {
  ...user,
  displayName: user.name || 'Anonymous',
  avatarUrl: user.avatar_url,
  // ... required additional fields
};
```

## Success Criteria

- [ ] All TypeScript compilation errors resolved
- [ ] No runtime errors in development
- [ ] All tests passing
- [ ] IntelliSense working correctly
- [ ] No performance regressions
- [ ] Documentation updated
- [ ] Team trained on new type system

## Timeline

- **Week 1:** Create new type modules (✅ Complete)
- **Week 2:** Migrate high-priority files
- **Week 3:** Migrate medium-priority files  
- **Week 4:** Testing and validation
- **Week 5:** Documentation and cleanup

## Support

For questions or issues during migration:
1. Check this guide first
2. Review the new type definitions in `/types`
3. Create an issue with specific migration problems
4. Consult with the development team

---

*Last updated: $(date)*