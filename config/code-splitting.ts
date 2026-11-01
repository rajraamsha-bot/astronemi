/**
 * Code Splitting Configuration
 * 
 * Route-based code splitting for optimized bundle loading
 * Implements aggressive lazy loading for 50+ screens
 */

import { lazy, ComponentType } from 'react';
import { Logger } from '@/services/logger';

// Route groups for code splitting - Aggressive splitting for optimal performance
export const RouteGroups = {
  // Critical path - loaded immediately (minimal set)
  critical: ['index', 'login'],
  
  // Core tabs - loaded after critical path
  core: ['horoscope', 'kundli', 'astrologers'],
  
  // Auth routes - loaded on demand
  auth: ['signup', 'forgot-password', 'verify-otp'],
  
  // User profile routes - lazy loaded
  profile: ['profile', 'wallet', 'settings', 'security', 'notifications'],
  
  // Astrology features - lazy loaded by category
  astrologyBasic: ['panchang', 'transit', 'muhurat'],
  astrologyAdvanced: ['varshphal', 'festivals', 'remedies', 'mantras'],
  
  // Advanced astrology - separate chunk
  advancedAstrology: [
    'ashtakvarga',
    'shadbala',
    'jaimini',
    'kp-astrology',
    'nadi',
    'prashna',
    'electional',
  ],
  
  // Compatibility - separate chunk
  compatibility: ['kundli-matching', 'chart-comparison'],
  
  // Specialized astrology - separate chunk
  specialized: [
    'medical-astrology',
    'financial-astrology',
    'child-astrology',
    'pet-astrology',
    'western',
    'chinese-astrology',
    'lal-kitab',
  ],
  
  // Divination - separate chunk
  divination: ['tarot', 'numerology', 'dreams'],
  
  // Consultation - loaded when needed
  consultation: [
    'consultations',
    'ask-question',
    'ai-chat',
    'ai-chatbot',
    'chat-history',
  ],
  
  // Video/Audio - separate chunk (heavy dependencies)
  media: ['live-streams', 'videos', 'podcasts'],
  
  // Commerce - loaded on checkout flow
  commerce: ['shop', 'cart', 'checkout', 'orders', 'gift-cards'],
  
  // Content - lazy loaded
  content: ['blog', 'news', 'courses', 'community'],
  
  // Lifestyle - lazy loaded
  lifestyle: ['meditation', 'vastu', 'daily-tips'],
  
  // Misc - low priority
  misc: [
    'about',
    'help',
    'privacy-policy',
    'terms',
    'referral',
    'subscription',
    'search',
    'event-calendar',
    'festival-countdown',
    'reminders',
    'corporate-plans',
    'gem-recommendation',
    'onboarding',
  ],
};

// Priority scoring for preloading
export const RoutePriority = {
  critical: 100,
  core: 90,
  profile: 70,
  consultation: 60,
  commerce: 50,
  astrologyBasic: 40,
  media: 30,
  content: 20,
  misc: 10,
};

// Feature flags for lazy loading - Aggressive optimization
export const LazyLoadConfig = {
  // Enable lazy loading for all routes
  enabled: true,
  
  // Preload routes on hover (web only)
  preloadOnHover: true,
  
  // Preload commonly accessed routes after initial load
  preloadAfterInit: ['profile', 'panchang', 'transit', 'consultations'],
  
  // Chunk naming convention
  chunkNaming: (routeName: string) => `route-${routeName}`,
  
  // Fallback component timeout - reduced for faster feedback
  fallbackTimeout: 5000,
  
  // Retry attempts for chunk loading failures
  retryAttempts: 3,
  
  // Retry delay in ms - reduced for faster recovery
  retryDelay: 500,
  
  // Component-level code splitting
  componentSplitting: true,
  
  // Vendor chunk splitting
  vendorSplitting: true,
  
  // Common chunk extraction
  commonChunk: true,
  
  // Minimum chunk size for splitting (bytes)
  minChunkSize: 10000,
  
  // Maximum chunk size before further splitting (bytes)
  maxChunkSize: 250000,
  
  // Priority loading for critical components
  priorityComponents: [
    'ErrorBoundary',
    'LoadingState',
    'Button',
    'Card',
  ],
  
  // Aggressive preloading strategy
  aggressivePreload: true,
  
  // Preload on network idle
  preloadOnIdle: true,
  
  // Preload on route hover (web)
  preloadOnRouteHover: true,
};

// Dynamic import factory with retry logic
export function createLazyComponent<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  chunkName: string
): React.LazyExoticComponent<T> {
  let attempts = 0;
  
  const retryImport = async (): Promise<{ default: T }> => {
    try {
      return await importFn();
    } catch (error) {
      if (attempts < LazyLoadConfig.retryAttempts) {
        attempts++;
        await new Promise(resolve => 
          setTimeout(resolve, LazyLoadConfig.retryDelay)
        );
        return retryImport();
      }
      throw error;
    }
  };
  
  // Log chunk loading for analytics (dev only)
  if (__DEV__) {
    Logger.debug(`Code Split: Loading chunk: ${chunkName}`);
  }
  
  return lazy(retryImport);
}

// Preload route function
export async function preloadRoute(routeName: string): Promise<void> {
  const routeMap: Record<string, () => Promise<unknown>> = {
    // Auth routes
    login: () => import('../app/login'),
    profile: () => import('../app/profile'),
    settings: () => import('../app/settings'),
    
    // Astrology routes
    panchang: () => import('../app/panchang'),
    transit: () => import('../app/transit'),
    kundli: () => import('../app/(tabs)/kundli'),
    horoscope: () => import('../app/(tabs)/horoscope'),
    
    // Consultation routes
    consultations: () => import('../app/consultations'),
    astrologers: () => import('../app/(tabs)/astrologers'),
    
    // Commerce routes
    shop: () => import('../app/shop'),
    cart: () => import('../app/cart'),
    
    // Content routes
    blog: () => import('../app/blog'),
    videos: () => import('../app/videos'),
    
    // Misc routes
    subscription: () => import('../app/subscription'),
    referral: () => import('../app/referral'),
    
    // Advanced astrology
    jaimini: () => import('../app/jaimini'),
    'kp-astrology': () => import('../app/kp-astrology'),
    ashtakvarga: () => import('../app/ashtakvarga'),
    shadbala: () => import('../app/shadbala'),
    
    // Specialized
    'medical-astrology': () => import('../app/medical-astrology'),
    'financial-astrology': () => import('../app/financial-astrology'),
    tarot: () => import('../app/tarot'),
    numerology: () => import('../app/numerology'),
  };
  
  const loader = routeMap[routeName];
  if (loader) {
    try {
      await loader();
      if (__DEV__) {
        Logger.debug(`Code Split: Preloaded: ${routeName}`);
      }
    } catch (error) {
      Logger.debug(`Code Split: Failed to preload ${routeName}`);
    }
  }
}

// Preload routes after initial app load
export function preloadInitialRoutes(): void {
  // Delay to not block initial render
  setTimeout(() => {
    LazyLoadConfig.preloadAfterInit.forEach(route => {
      preloadRoute(route);
    });
  }, 2000);
}

// Preload routes on network idle (web only)
export function preloadOnNetworkIdle(): void {
  if (typeof window === 'undefined') return;
  
  if ('requestIdleCallback' in window) {
    (window as unknown as { requestIdleCallback: (callback: () => void) => void }).requestIdleCallback(() => {
      // Preload lower priority routes
      const lowerPriorityRoutes = [
        'blog', 'videos', 'courses', 'community',
        'tarot', 'numerology', 'dreams',
        'about', 'help', 'privacy-policy', 'terms'
      ];
      
      lowerPriorityRoutes.forEach(route => {
        preloadRoute(route);
      });
    });
  }
}

// Preload route on hover (web only)
export function preloadRouteOnHover(routeName: string): () => void {
  if (typeof window === 'undefined') return () => {};
  
  // Debounce preload to avoid excessive loading
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      preloadRoute(routeName);
    }, 100);
  };
}

// Get route group for a given route
export function getRouteGroup(routeName: string): string | null {
  for (const [group, routes] of Object.entries(RouteGroups)) {
    if (routes.includes(routeName)) {
      return group;
    }
  }
  return null;
}

// Check if route should be lazy loaded
export function shouldLazyLoad(routeName: string): boolean {
  if (!LazyLoadConfig.enabled) return false;
  
  // Core routes are always loaded immediately
  if (RouteGroups.core.includes(routeName)) return false;
  
  return true;
}

// Bundle size tracking (for development)
export const BundleTracker = {
  chunks: new Map<string, { loaded: boolean; size?: number }>(),
  
  markLoaded(chunkName: string, size?: number): void {
    this.chunks.set(chunkName, { loaded: true, size });
  },
  
  getLoadedChunks(): string[] {
    return Array.from(this.chunks.entries())
      .filter(([, data]) => data.loaded)
      .map(([name]) => name);
  },
  
  getTotalSize(): number {
    let total = 0;
    this.chunks.forEach(data => {
      if (data.size) total += data.size;
    });
    return total;
  },
};

export default {
  RouteGroups,
  LazyLoadConfig,
  createLazyComponent,
  preloadRoute,
  preloadInitialRoutes,
  getRouteGroup,
  shouldLazyLoad,
  BundleTracker,
};
