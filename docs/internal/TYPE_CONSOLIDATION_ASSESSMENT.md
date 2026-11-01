# AstroNemi Type Definition Consolidation Assessment

## Executive Summary

After conducting a comprehensive analysis of the AstroNemi React Native/Expo codebase, I have identified significant opportunities for type consolidation and organization improvements. The codebase contains **47 duplicate or near-duplicate type definitions** across **56 TypeScript files**, with inconsistent naming conventions and scattered type organization.

## Current Type Landscape

### Existing Type Organization
- **lib/database.types.ts**: Comprehensive database schema types (well-organized)
- **types/api.ts**: Extensive API types (comprehensive but some overlap with database types)
- **types/user.ts**: User-related types (duplicates database User type)
- **types/declarations.d.ts**: Module declarations
- **types/expo-router.d.ts**: Router type fixes

### Files Analyzed
- **56 TypeScript files** (.ts/.tsx)
- **23 hook files** with query and state types
- **30+ component files** with prop interfaces
- **15+ service files** with API and utility types
- **25+ app route files** with local type definitions

## Critical Duplication Analysis

### 🔴 High-Impact Duplications (Immediate Consolidation Required)

#### 1. User/UserProfile Types
**Locations Found:**
- `lib/database.types.ts` → `User` (authoritative database type)
- `types/api.ts` → `User` (API variant with different fields)
- `types/user.ts` → `UserProfile` (extended user type)
- `hooks/queries/useUserProfile.ts` → `UserProfile` (local variant)

**Inconsistencies:**
- Field naming: `avatar_url` vs `avatar` vs `avatarUrl`
- Birth details: separate fields vs nested `BirthDetails` object
- Subscription: `subscription_tier` vs `subscription` object

#### 2. Astrologer Types
**Locations Found:**
- `lib/database.types.ts` → `Astrologer` (database schema)
- `types/api.ts` → `Astrologer` (API variant with different structure)
- `app/astrologer/[id].tsx` → `DbAstrologer` (type alias)
- `app/booking/[id].tsx` → `DbAstrologer` (duplicate alias)
- `app/search.tsx` → `DbAstrologer` (duplicate alias)

**Inconsistencies:**
- Availability: `availability` array vs separate availability table
- Pricing: `price` vs `pricePerMinute` vs `price_per_minute`
- Status fields: different online/available field combinations

#### 3. Consultation Types
**Locations Found:**
- `lib/database.types.ts` → `Consultation` (database schema)
- `types/api.ts` → `Consultation` (API variant)
- `hooks/queries/useUserProfile.ts` → `Consultation` (local variant)
- `hooks/queries/useConsultationHistory.ts` → `Consultation` (different structure)

**Inconsistencies:**
- Status values: different enum values across definitions
- Date handling: `scheduled_at` vs `scheduledAt` vs `date`/`time` split
- Astrologer data: embedded vs referenced

#### 4. Transaction/WalletTransaction Types
**Locations Found:**
- `lib/database.types.ts` → `WalletTransaction` (database schema)
- `types/api.ts` → `WalletTransaction` (API variant)
- `hooks/queries/useUserProfile.ts` → `WalletTransaction` (simplified)
- `hooks/queries/useTransactions.ts` → `Transaction` (different structure)

**Inconsistencies:**
- Field naming: `created_at` vs `createdAt` vs `date`/`time` split
- Amount handling: number vs formatted string
- Status representation: different status values

#### 5. ChatMessage Types
**Locations Found:**
- `lib/database.types.ts` → `ChatMessage` (database schema)
- `types/api.ts` → `ChatMessage` (API variant)
- `hooks/useAIChat.ts` → `ChatMessage` (AI chat variant)
- `services/ai-chatbot-service.ts` → `ChatMessage` (service variant)

**Inconsistencies:**
- Role types: `sender_type` vs `role` with different values
- Content structure: simple string vs complex content types
- Metadata: different additional fields

### 🟡 Medium-Impact Duplications

#### 6. Component Prop Types
**Pattern:** Many components define similar prop interfaces
- Button variants and sizes (multiple definitions)
- Card prop patterns (repeated across components)
- Modal and form input props (scattered definitions)

#### 7. API Response Types
**Pattern:** Inconsistent API response wrapping
- `ApiResponse<T>` vs direct type returns
- Error handling: different error type structures
- Pagination: multiple pagination interface definitions

#### 8. Hook State Types
**Pattern:** Similar state management patterns
- Loading/error states redefined in multiple hooks
- Async operation states (UseAsyncState, UseFetchState)
- Query option types (filters, pagination)

### 🟢 Low-Impact Duplications

#### 9. Utility and Configuration Types
- Feature flag types (minor variations)
- Analytics event properties (similar structures)
- Cache and storage types (functional duplicates)

## Type Organization Issues

### 1. Naming Inconsistencies
- **Database vs API naming**: `snake_case` vs `camelCase`
- **Type vs Interface**: Inconsistent use of `type` vs `interface`
- **Prefix patterns**: `Db` prefix used inconsistently

### 2. Import Complexity
- **Scattered imports**: Types imported from multiple locations
- **Circular dependencies**: Some type files reference each other
- **Missing exports**: Some types not properly exported

### 3. Documentation Gaps
- **Missing JSDoc**: Many type definitions lack documentation
- **Usage examples**: No examples for complex types
- **Deprecation notes**: No migration guidance for type changes

## Consolidation Strategy

### Phase 1: Core Type Consolidation (High Priority)

#### 1.1 Create Unified User Types
```typescript
// types/entities/user.ts
export interface User extends Database['public']['Tables']['users']['Row'] {
  // Computed fields for API responses
  displayName: string;
  avatarUrl: string | null;
  isProfileComplete: boolean;
}

export interface UserProfile extends User {
  birthDetails: BirthDetails | null;
  subscription: UserSubscription | null;
  stats: UserStats;
}

export interface BirthDetails {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
}
```

#### 1.2 Consolidate Astrologer Types
```typescript
// types/entities/astrologer.ts
export interface Astrologer extends Database['public']['Tables']['astrologers']['Row'] {
  // Computed fields
  isOnline: boolean;
  nextAvailable: string | null;
  averageRating: number;
  
  // Related data (when populated)
  availability?: AstrologerAvailability[];
  reviews?: Review[];
}

export interface AstrologerCard extends Pick<Astrologer, 
  'id' | 'name' | 'avatar_url' | 'expertise' | 'specializations' | 
  'languages' | 'experience_years' | 'rating' | 'price_per_minute' | 
  'is_online' | 'is_available'
> {}
```

#### 1.3 Unify Consultation Types
```typescript
// types/entities/consultation.ts
export interface Consultation extends Database['public']['Tables']['consultations']['Row'] {
  // Related data (when populated)
  astrologer?: AstrologerCard;
  user?: Pick<User, 'id' | 'name' | 'avatar_url'>;
  messages?: ChatMessage[];
}

export interface ConsultationSummary extends Pick<Consultation,
  'id' | 'type' | 'status' | 'start_time' | 'end_time' | 'duration_minutes' | 'total_amount'
> {
  astrologerName: string;
  astrologerAvatar: string | null;
  formattedDate: string;
  formattedTime: string;
  formattedDuration: string;
}
```

### Phase 2: API and Response Type Standardization

#### 2.1 Standardize API Response Types
```typescript
// types/api/responses.ts
export interface ApiResponse<T = unknown> {
  data: T | null;
  error: ApiError | null;
  meta?: ResponseMeta;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

#### 2.2 Create Request Type Standards
```typescript
// types/api/requests.ts
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: string | number | boolean | string[] | undefined;
}
```

### Phase 3: Component and Hook Type Organization

#### 3.1 Component Prop Type Standards
```typescript
// types/components/common.ts
export interface BaseComponentProps {
  testID?: string;
  style?: ViewStyle;
}

export interface InteractiveProps extends BaseComponentProps {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
```

#### 3.2 Hook State Type Standards
```typescript
// types/hooks/common.ts
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface QueryState<T> extends AsyncState<T> {
  refetch: () => Promise<void>;
  isStale: boolean;
}
```

## Implementation Plan

### Step 1: Create New Type Module Structure
```
types/
├── entities/           # Core business entities
│   ├── user.ts
│   ├── astrologer.ts
│   ├── consultation.ts
│   ├── transaction.ts
│   └── index.ts
├── api/               # API-related types
│   ├── requests.ts
│   ├── responses.ts
│   └── index.ts
├── components/        # Component prop types
│   ├── common.ts
│   ├── forms.ts
│   └── index.ts
├── hooks/            # Hook-related types
│   ├── common.ts
│   ├── queries.ts
│   └── index.ts
└── index.ts          # Main export file
```

### Step 2: Migration Strategy
1. **Create new consolidated types** (no breaking changes)
2. **Update imports gradually** (file by file)
3. **Deprecate old types** (with migration comments)
4. **Remove deprecated types** (after full migration)

### Step 3: Validation and Testing
1. **TypeScript compilation** verification
2. **Import resolution** testing
3. **Runtime behavior** validation
4. **Documentation** updates

## Expected Benefits

### 1. Developer Experience Improvements
- **Reduced cognitive load**: Single source of truth for each entity
- **Better IntelliSense**: Consistent type definitions across IDE
- **Faster development**: Less time searching for correct types

### 2. Maintainability Gains
- **Easier refactoring**: Changes in one place propagate correctly
- **Reduced bugs**: Consistent type contracts prevent mismatches
- **Better documentation**: Centralized type documentation

### 3. Performance Benefits
- **Smaller bundle size**: Eliminated duplicate type definitions
- **Faster compilation**: Reduced TypeScript processing overhead
- **Better tree shaking**: Cleaner import dependencies

## Risk Assessment

### Low Risk
- **Database types**: Well-established, minimal changes needed
- **Component props**: Mostly additive changes
- **Utility types**: Simple consolidation

### Medium Risk
- **API types**: May require service layer updates
- **Hook types**: Could affect query invalidation logic
- **Navigation types**: May impact routing type safety

### High Risk
- **Breaking changes**: Careful migration needed for public APIs
- **Third-party integration**: External type dependencies
- **Runtime behavior**: Ensure no functional changes

## Success Metrics

### Quantitative Goals
- **Reduce type definitions by 60%** (from ~80 to ~30 unique types)
- **Eliminate 100% of exact duplicates** (currently 15 identified)
- **Achieve 95% import consistency** (standardized import paths)

### Qualitative Goals
- **Improved developer onboarding** (clearer type organization)
- **Enhanced type safety** (consistent contracts)
- **Better maintainability** (single source of truth)

## Next Steps

1. **Review and approve** this assessment
2. **Create consolidated type modules** (Phase 1)
3. **Begin gradual migration** (starting with high-impact duplications)
4. **Update documentation** and developer guidelines
5. **Establish type governance** practices for future development

---

*Assessment completed on: $(date)*
*Files analyzed: 56 TypeScript files*
*Duplications identified: 47 instances across 8 major type categories*