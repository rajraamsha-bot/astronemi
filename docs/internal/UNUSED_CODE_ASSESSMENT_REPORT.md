# AstroNemi Unused Code Detection & Removal Assessment Report

## Executive Summary

Comprehensive static analysis using knip has identified significant opportunities for code cleanup and bundle size optimization in the AstroNemi React Native/Expo application. The analysis found:

- **113 unused files** (potential for removal)
- **24 unused dependencies** (can be removed from package.json)
- **5 unused devDependencies** (can be removed)
- **266 unused exports** (can be cleaned up)
- **51 duplicate exports** (can be consolidated)

## Detailed Findings

### 1. High-Confidence Unused Files (Safe to Remove)

#### Configuration & Build Files
- `detox.config.js` - E2E testing config (not actively used)
- `monitoring-alerting-config.ts` - Monitoring setup (unused)
- `monitoring-config.ts` - Monitoring configuration (unused)
- `performance-config.ts` - Performance monitoring (unused)
- `security-audit-config.ts` - Security audit setup (unused)
- `security-audit.ts` - Security audit implementation (unused)

#### Backend Files (Unused Hono/tRPC Setup)
- `backend/hono.ts` - Hono server setup (unused)
- `backend/trpc/app-router.ts` - tRPC router (unused)
- `backend/trpc/create-context.ts` - tRPC context (unused)
- `backend/trpc/routes/example.ts` - Example tRPC routes (unused)

#### Unused Components
- `components/EmptyState.tsx` - Replaced by `components/shared/EmptyState.tsx`
- `components/FormInput.tsx` - Not imported anywhere
- `components/LocationPicker.tsx` - Not imported anywhere
- `components/PlatformLinearGradient.tsx` - Not imported anywhere
- `components/SkeletonLoader.tsx` - Not imported anywhere

#### Unused Constants & Index Files
- `constants/index.ts` - Central export not used (files import directly)
- `constants/astrology.ts` - Large legacy file, not imported
- `constants/houses.ts` - Not imported anywhere
- `constants/planets.ts` - Not imported anywhere
- `constants/zodiac.ts` - Not imported anywhere

#### Unused Utilities
- `utils/cache.ts` - Caching utilities (unused)
- `utils/date-time.ts` - Date utilities (unused)
- `utils/form-validation.ts` - Form validation (unused)
- `utils/helpers.ts` - General helpers (unused)
- `utils/index.ts` - Central export (unused)
- `utils/lazy-loader.tsx` - Lazy loading utilities (unused)
- `utils/navigation.ts` - Navigation utilities (unused)
- `utils/offline-storage.ts` - Offline storage (unused)
- `utils/performance-utils.ts` - Performance utilities (unused)
- `utils/production-logger.ts` - Production logging (unused)
- `utils/rate-limiter.ts` - Rate limiting (unused)
- `utils/sharing.ts` - Sharing utilities (unused)

### 2. High-Confidence Unused Dependencies

#### React Native Libraries (Not Used)
- `react-native-gifted-chat` - Chat UI library (no GiftedChat imports found)
- `react-native-skeleton-placeholder` - Skeleton loading (no imports found)
- `react-native-toast-message` - Toast notifications (no imports found)
- `react-native-worklets-core` - Worklets (no imports found)

#### Expo Modules (Not Used)
- `expo-blur` - Blur effects (no BlurView imports found)
- `expo-splash-screen` - Splash screen (no imports found)
- `expo-sqlite` - SQLite database (no imports found)
- `expo-status-bar` - Status bar (no imports found)
- `expo-symbols` - SF Symbols (no imports found)

#### Backend/API Libraries (Not Used)
- `@hono/trpc-server` - Hono tRPC integration (backend files unused)
- `@trpc/client` - tRPC client (no tRPC usage found)
- `@trpc/react-query` - tRPC React Query (no tRPC usage found)
- `@trpc/server` - tRPC server (backend files unused)
- `hono` - Hono web framework (backend files unused)
- `socket.io-client` - WebSocket client (no socket.io imports found)
- `superjson` - JSON serialization (no imports found)

#### State Management (Not Used)
- `zustand` - State management (no zustand imports found)

#### Validation & Utilities (Not Used)
- `zod` - Schema validation (no zod imports found)
- `@ungap/structured-clone` - Polyfill (no imports found)

### 3. Medium-Confidence Unused Dependencies (Require Verification)

#### Expo Modules (May be Used Implicitly)
- `expo-modules-core` - Core Expo functionality (may be used by other Expo modules)
- `@react-native-masked-view/masked-view` - Masked views (may be used by navigation)

#### Toolkit SDK
- `@rork-ai/toolkit-sdk` - Custom toolkit (may be used dynamically)

### 4. Unused DevDependencies (Safe to Remove)

- `@babel/types` - Babel types (not used in build)
- `@expo/ngrok` - Ngrok integration (not used)
- `@testing-library/jest-native` - Testing utilities (not used)
- `browserslist` - Browser compatibility (not needed for React Native)
- `caniuse-lite` - Browser support data (not needed for React Native)

### 5. Unused Exports Analysis

#### High-Impact Unused Exports (Large Files)
- Multiple theme-related exports in `contexts/ThemeContext.tsx`
- Extensive astrology calculation functions in various utils files
- Many API service functions that aren't called
- Comprehensive accessibility helper functions
- Multiple analytics and monitoring functions

## Risk Assessment

### Low Risk (Safe for Immediate Removal)
- Unused configuration files
- Unused backend setup files
- Clearly unused components with no imports
- Dependencies with no imports found in codebase
- DevDependencies not used in build process

### Medium Risk (Requires Testing)
- Expo modules that might be used implicitly
- Large utility files with many exports
- Files that might be used dynamically

### High Risk (Requires Careful Analysis)
- Core Expo modules
- Navigation-related dependencies
- Files that might be used in build processes

## Estimated Bundle Size Impact

### Dependencies Removal
- Removing 24 unused dependencies: **~15-25MB** reduction in node_modules
- Key savings from large libraries:
  - `react-native-gifted-chat`: ~2MB
  - `socket.io-client`: ~1.5MB
  - `zustand`: ~50KB
  - `@trpc/*` packages: ~2MB combined

### File Removal
- Removing 113 unused files: **~500KB-1MB** reduction in bundle size
- Key savings from large files:
  - Backend tRPC setup: ~100KB
  - Unused utility files: ~200KB
  - Unused components: ~50KB

### Total Estimated Savings
- **Development bundle**: 16-26MB reduction
- **Production bundle**: 1-2MB reduction
- **Build time**: 10-15% improvement

## Implementation Plan

### Phase 1: Low-Risk Removals (Immediate)
1. Remove unused configuration files
2. Remove unused backend files
3. Remove clearly unused components
4. Remove unused devDependencies

### Phase 2: Dependency Cleanup (After Testing)
1. Remove unused React Native libraries
2. Remove unused Expo modules
3. Remove unused API/backend dependencies
4. Update package.json

### Phase 3: Export Cleanup (Gradual)
1. Remove unused exports from large files
2. Consolidate duplicate exports
3. Clean up index files

### Phase 4: Validation & Testing
1. Run full test suite
2. Test on iOS/Android/Web platforms
3. Verify build processes
4. Performance testing

## Recommendations

### Immediate Actions
1. **Start with Phase 1** - Remove low-risk files immediately
2. **Create backup branch** before major removals
3. **Run tests after each batch** of removals

### Long-term Maintenance
1. **Set up knip in CI/CD** to prevent future unused code accumulation
2. **Regular cleanup schedule** (monthly reviews)
3. **Import linting rules** to prevent unused imports

### Development Practices
1. **Use direct imports** instead of index files for better tree-shaking
2. **Lazy load large utilities** to reduce initial bundle size
3. **Regular dependency audits** to catch unused packages early

## Next Steps

1. **Review and approve** this assessment
2. **Create feature branch** for cleanup work
3. **Start with Phase 1 removals**
4. **Set up automated testing** for each phase
5. **Monitor bundle size** improvements

---

*Report generated on: $(date)*
*Analysis tool: knip v3.x*
*Confidence level: High for flagged items*