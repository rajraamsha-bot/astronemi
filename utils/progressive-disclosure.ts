/**
 * Progressive Disclosure System
 * 
 * Controls which features are visible to users based on:
 * - User tier (New, Engaged, Power)
 * - Session count
 * - Days since signup
 * - Subscription status
 */

import { UserRole } from './rbac';
import { AI_FEATURES_ENABLED } from '@/config/ai-features';

export enum UserTier {
  NEW = 'new',           // 0-2 days, 0-5 sessions
  ENGAGED = 'engaged',   // 3-7 days, 6-15 sessions
  POWER = 'power',       // 8+ days, 16+ sessions, or subscribed
}

export interface UserEngagement {
  sessionCount: number;
  daysSinceSignup: number;
  hasSubscription: boolean;
  userRole: UserRole;
  completedOnboarding: boolean;
}

export interface FeatureAccess {
  id: string;
  name: string;
  route: string;
  tier: UserTier;
  requiresSubscription?: boolean;
  category: string;
  icon?: string;
  description?: string;
}

/**
 * Determine user tier based on engagement metrics
 */
export function getUserTier(engagement: UserEngagement): UserTier {
  // Power users: subscribed or highly engaged
  if (
    engagement.hasSubscription ||
    engagement.userRole !== UserRole.FREE ||
    (engagement.sessionCount >= 16 && engagement.daysSinceSignup >= 8)
  ) {
    return UserTier.POWER;
  }

  // Engaged users: moderate activity
  if (
    engagement.sessionCount >= 6 ||
    engagement.daysSinceSignup >= 3
  ) {
    return UserTier.ENGAGED;
  }

  // New users: just starting
  return UserTier.NEW;
}

/**
 * All app features with their tier requirements
 */
export const ALL_FEATURES: FeatureAccess[] = [
  // TIER 1: NEW USERS (10 core features)
  {
    id: 'home',
    name: 'Home',
    route: '/',
    tier: UserTier.NEW,
    category: 'core',
    description: 'Your personalized astrology dashboard',
  },
  {
    id: 'horoscope',
    name: 'Daily Horoscope',
    route: '/(tabs)/horoscope',
    tier: UserTier.NEW,
    category: 'core',
    description: 'Your daily astrological forecast',
  },
  {
    id: 'kundli-basic',
    name: 'Kundli Generator',
    route: '/(tabs)/kundli',
    tier: UserTier.NEW,
    category: 'core',
    description: 'Generate your birth chart',
  },
  {
    id: 'ai-chat',
    name: 'AI Astrologer',
    route: '/ai-chat',
    tier: UserTier.NEW,
    category: 'core',
    description: 'Chat with AI astrology assistant',
  },
  {
    id: 'astrologers',
    name: 'Talk to Astrologers',
    route: '/(tabs)/astrologers',
    tier: UserTier.NEW,
    category: 'core',
    description: 'Connect with expert astrologers',
  },
  {
    id: 'panchang',
    name: 'Panchang',
    route: '/panchang',
    tier: UserTier.NEW,
    category: 'core',
    description: 'Daily Hindu calendar',
  },
  {
    id: 'subscription',
    name: 'Premium Plans',
    route: '/subscription',
    tier: UserTier.NEW,
    category: 'core',
    description: 'Unlock all features',
  },
  {
    id: 'profile',
    name: 'Profile',
    route: '/(tabs)/profile',
    tier: UserTier.NEW,
    category: 'core',
    description: 'Manage your account',
  },
  {
    id: 'help',
    name: 'Help & Support',
    route: '/help',
    tier: UserTier.NEW,
    category: 'core',
    description: 'Get help and support',
  },
  {
    id: 'search',
    name: 'Search',
    route: '/search',
    tier: UserTier.NEW,
    category: 'core',
    description: 'Find features quickly',
  },

  // TIER 2: ENGAGED USERS (20 additional features)
  {
    id: 'kundli-matching',
    name: 'Kundli Matching',
    route: '/kundli-matching',
    tier: UserTier.ENGAGED,
    category: 'kundli',
    description: 'Check compatibility with partner',
  },
  {
    id: 'muhurat',
    name: 'Muhurat',
    route: '/muhurat',
    tier: UserTier.ENGAGED,
    category: 'timing',
    description: 'Find auspicious timings',
  },
  {
    id: 'transit',
    name: 'Transit Analysis',
    route: '/transit',
    tier: UserTier.ENGAGED,
    category: 'analysis',
    description: 'Current planetary transits',
  },
  {
    id: 'remedies',
    name: 'Remedies',
    route: '/remedies',
    tier: UserTier.ENGAGED,
    category: 'guidance',
    description: 'Astrological remedies and solutions',
  },
  {
    id: 'video-consultation',
    name: 'Video Consultations',
    route: '/video-consultation',
    tier: UserTier.ENGAGED,
    category: 'consultation',
    requiresSubscription: true,
    description: 'Face-to-face with astrologers',
  },
  {
    id: 'shop',
    name: 'Shop',
    route: '/shop',
    tier: UserTier.ENGAGED,
    category: 'ecommerce',
    description: 'Spiritual products and services',
  },
  {
    id: 'pooja',
    name: 'Book Pooja',
    route: '/pooja',
    tier: UserTier.ENGAGED,
    category: 'ecommerce',
    description: 'Book religious ceremonies',
  },
  {
    id: 'blog',
    name: 'Blog',
    route: '/blog',
    tier: UserTier.ENGAGED,
    category: 'content',
    description: 'Astrology articles and insights',
  },
  {
    id: 'videos',
    name: 'Videos',
    route: '/videos',
    tier: UserTier.ENGAGED,
    category: 'content',
    description: 'Educational astrology videos',
  },
  {
    id: 'community',
    name: 'Community',
    route: '/community',
    tier: UserTier.ENGAGED,
    category: 'social',
    description: 'Connect with other users',
  },
  {
    id: 'festivals',
    name: 'Festivals',
    route: '/festivals',
    tier: UserTier.ENGAGED,
    category: 'calendar',
    description: 'Hindu festival calendar',
  },
  {
    id: 'gem-recommendation',
    name: 'Gemstone Guide',
    route: '/gem-recommendation',
    tier: UserTier.ENGAGED,
    category: 'guidance',
    description: 'Find your lucky gemstone',
  },
  {
    id: 'vastu',
    name: 'Vastu',
    route: '/vastu',
    tier: UserTier.ENGAGED,
    category: 'guidance',
    description: 'Vastu Shastra guidance',
  },
  {
    id: 'numerology',
    name: 'Numerology',
    route: '/numerology',
    tier: UserTier.ENGAGED,
    category: 'alternative',
    description: 'Numerology readings',
  },
  {
    id: 'wallet',
    name: 'Wallet',
    route: '/wallet',
    tier: UserTier.ENGAGED,
    category: 'account',
    description: 'Manage your wallet balance',
  },
  {
    id: 'orders',
    name: 'My Orders',
    route: '/orders',
    tier: UserTier.ENGAGED,
    category: 'account',
    description: 'View order history',
  },
  {
    id: 'chat-history',
    name: 'Chat History',
    route: '/chat-history',
    tier: UserTier.ENGAGED,
    category: 'account',
    description: 'View past conversations',
  },
  {
    id: 'consultations',
    name: 'My Consultations',
    route: '/consultations',
    tier: UserTier.ENGAGED,
    category: 'account',
    description: 'Manage consultations',
  },
  {
    id: 'settings',
    name: 'Settings',
    route: '/settings',
    tier: UserTier.ENGAGED,
    category: 'account',
    description: 'App preferences',
  },
  {
    id: 'referral',
    name: 'Refer & Earn',
    route: '/referral',
    tier: UserTier.ENGAGED,
    category: 'rewards',
    description: 'Invite friends and earn rewards',
  },

  // TIER 3: POWER USERS (All remaining features)
  {
    id: 'kp-astrology',
    name: 'KP Astrology',
    route: '/kp-astrology',
    tier: UserTier.POWER,
    category: 'advanced',
    requiresSubscription: true,
    description: 'Krishnamurti Paddhati system',
  },
  {
    id: 'lal-kitab',
    name: 'Lal Kitab',
    route: '/lal-kitab',
    tier: UserTier.POWER,
    category: 'advanced',
    requiresSubscription: true,
    description: 'Lal Kitab astrology',
  },
  {
    id: 'nadi',
    name: 'Nadi Astrology',
    route: '/nadi',
    tier: UserTier.POWER,
    category: 'advanced',
    requiresSubscription: true,
    description: 'Ancient Nadi system',
  },
  {
    id: 'jaimini',
    name: 'Jaimini',
    route: '/jaimini',
    tier: UserTier.POWER,
    category: 'advanced',
    requiresSubscription: true,
    description: 'Jaimini astrology system',
  },
  {
    id: 'prashna',
    name: 'Prashna (Horary)',
    route: '/prashna',
    tier: UserTier.POWER,
    category: 'advanced',
    requiresSubscription: true,
    description: 'Question-based astrology',
  },
  {
    id: 'ashtakvarga',
    name: 'Ashtakvarga',
    route: '/ashtakvarga',
    tier: UserTier.POWER,
    category: 'advanced',
    requiresSubscription: true,
    description: 'Advanced predictive system',
  },
  {
    id: 'shadbala',
    name: 'Shadbala',
    route: '/shadbala',
    tier: UserTier.POWER,
    category: 'advanced',
    requiresSubscription: true,
    description: 'Planetary strength analysis',
  },
  {
    id: 'varshphal',
    name: 'Varshphal',
    route: '/varshphal',
    tier: UserTier.POWER,
    category: 'advanced',
    requiresSubscription: true,
    description: 'Annual predictions',
  },
  {
    id: 'western',
    name: 'Western Astrology',
    route: '/western',
    tier: UserTier.POWER,
    category: 'alternative',
    description: 'Western zodiac system',
  },
  {
    id: 'chinese-astrology',
    name: 'Chinese Astrology',
    route: '/chinese-astrology',
    tier: UserTier.POWER,
    category: 'alternative',
    description: 'Chinese zodiac system',
  },
  {
    id: 'tarot',
    name: 'Tarot',
    route: '/tarot',
    tier: UserTier.POWER,
    category: 'alternative',
    description: 'Tarot card readings',
  },
  {
    id: 'medical-astrology',
    name: 'Medical Astrology',
    route: '/medical-astrology',
    tier: UserTier.POWER,
    category: 'specialized',
    requiresSubscription: true,
    description: 'Health predictions',
  },
  {
    id: 'financial-astrology',
    name: 'Financial Astrology',
    route: '/financial-astrology',
    tier: UserTier.POWER,
    category: 'specialized',
    requiresSubscription: true,
    description: 'Financial predictions',
  },
  {
    id: 'child-astrology',
    name: 'Child Astrology',
    route: '/child-astrology',
    tier: UserTier.POWER,
    category: 'specialized',
    description: 'Child birth chart analysis',
  },
  {
    id: 'pet-astrology',
    name: 'Pet Astrology',
    route: '/pet-astrology',
    tier: UserTier.POWER,
    category: 'specialized',
    description: 'Astrology for pets',
  },
  {
    id: 'electional',
    name: 'Electional Astrology',
    route: '/electional',
    tier: UserTier.POWER,
    category: 'specialized',
    requiresSubscription: true,
    description: 'Election timing',
  },
  {
    id: 'chart-comparison',
    name: 'Chart Comparison',
    route: '/chart-comparison',
    tier: UserTier.POWER,
    category: 'analysis',
    requiresSubscription: true,
    description: 'Compare multiple charts',
  },
  {
    id: 'podcasts',
    name: 'Podcasts',
    route: '/podcasts',
    tier: UserTier.POWER,
    category: 'content',
    description: 'Astrology podcasts',
  },
  {
    id: 'live-streams',
    name: 'Live Streams',
    route: '/live-streams',
    tier: UserTier.POWER,
    category: 'content',
    description: 'Live astrology sessions',
  },
  {
    id: 'mantras',
    name: 'Mantras',
    route: '/mantras',
    tier: UserTier.POWER,
    category: 'spiritual',
    description: 'Sacred mantras',
  },
  {
    id: 'meditation',
    name: 'Meditation',
    route: '/meditation',
    tier: UserTier.POWER,
    category: 'spiritual',
    description: 'Guided meditations',
  },
  {
    id: 'dreams',
    name: 'Dream Interpretation',
    route: '/dreams',
    tier: UserTier.POWER,
    category: 'guidance',
    description: 'Understand your dreams',
  },
  {
    id: 'daily-tips',
    name: 'Daily Tips',
    route: '/daily-tips',
    tier: UserTier.POWER,
    category: 'content',
    description: 'Daily astrology tips',
  },
  {
    id: 'event-calendar',
    name: 'Event Calendar',
    route: '/event-calendar',
    tier: UserTier.POWER,
    category: 'calendar',
    description: 'Astrological events',
  },
  {
    id: 'festival-countdown',
    name: 'Festival Countdown',
    route: '/festival-countdown',
    tier: UserTier.POWER,
    category: 'calendar',
    description: 'Upcoming festivals',
  },
  {
    id: 'corporate-plans',
    name: 'Corporate Plans',
    route: '/corporate-plans',
    tier: UserTier.POWER,
    category: 'business',
    description: 'Business solutions',
  },
  {
    id: 'reminders',
    name: 'Reminders',
    route: '/reminders',
    tier: UserTier.POWER,
    category: 'utility',
    description: 'Set astrological reminders',
  },
  {
    id: 'news',
    name: 'Astrology News',
    route: '/news',
    tier: UserTier.POWER,
    category: 'content',
    description: 'Latest astrology news',
  },
];

/**
 * Get features accessible to a user based on their tier
 */
export function getAccessibleFeatures(
  userTier: UserTier,
  hasSubscription: boolean
): FeatureAccess[] {
  const tierOrder = {
    [UserTier.NEW]: 0,
    [UserTier.ENGAGED]: 1,
    [UserTier.POWER]: 2,
  };

  return ALL_FEATURES.filter(feature => {
    // AI surfaces stay in ALL_FEATURES for future re-enable, but are never
    // discoverable in an AI-off build.
    if (feature.id === 'ai-chat' && !AI_FEATURES_ENABLED) return false;

    // Check tier requirement
    const tierMet = tierOrder[userTier] >= tierOrder[feature.tier];
    
    // Check subscription requirement
    const subscriptionMet = !feature.requiresSubscription || hasSubscription;
    
    return tierMet && subscriptionMet;
  });
}

/**
 * Check if a specific feature is accessible
 */
export function canAccessFeature(
  featureId: string,
  userTier: UserTier,
  hasSubscription: boolean
): boolean {
  const accessibleFeatures = getAccessibleFeatures(userTier, hasSubscription);
  return accessibleFeatures.some(f => f.id === featureId);
}

/**
 * Get features grouped by category
 */
export function getFeaturesByCategory(
  userTier: UserTier,
  hasSubscription: boolean
): Record<string, FeatureAccess[]> {
  const accessible = getAccessibleFeatures(userTier, hasSubscription);
  
  return accessible.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category]!.push(feature);
    return acc;
  }, {} as Record<string, FeatureAccess[]>);
}

/**
 * Get locked features (to show as upgrade prompts)
 */
export function getLockedFeatures(
  userTier: UserTier,
  hasSubscription: boolean
): FeatureAccess[] {
  return ALL_FEATURES.filter(feature => {
    return !canAccessFeature(feature.id, userTier, hasSubscription);
  });
}

/**
 * Calculate progress to next tier
 */
export function getTierProgress(engagement: UserEngagement): {
  currentTier: UserTier;
  nextTier: UserTier | null;
  progress: number; // 0-100
  requirements: string[];
} {
  const currentTier = getUserTier(engagement);
  
  if (currentTier === UserTier.POWER) {
    return {
      currentTier,
      nextTier: null,
      progress: 100,
      requirements: [],
    };
  }
  
  if (currentTier === UserTier.NEW) {
    const sessionsNeeded = Math.max(0, 6 - engagement.sessionCount);
    const daysNeeded = Math.max(0, 3 - engagement.daysSinceSignup);
    const progress = Math.min(100, 
      ((engagement.sessionCount / 6) * 50) + 
      ((engagement.daysSinceSignup / 3) * 50)
    );
    
    const requirements = [];
    if (sessionsNeeded > 0) requirements.push(`${sessionsNeeded} more sessions`);
    if (daysNeeded > 0) requirements.push(`${daysNeeded} more days`);
    
    return {
      currentTier,
      nextTier: UserTier.ENGAGED,
      progress,
      requirements,
    };
  }
  
  // ENGAGED -> POWER
  const sessionsNeeded = Math.max(0, 16 - engagement.sessionCount);
  const daysNeeded = Math.max(0, 8 - engagement.daysSinceSignup);
  const progress = Math.min(100,
    ((engagement.sessionCount / 16) * 50) +
    ((engagement.daysSinceSignup / 8) * 50)
  );
  
  const requirements = [];
  if (sessionsNeeded > 0) requirements.push(`${sessionsNeeded} more sessions`);
  if (daysNeeded > 0) requirements.push(`${daysNeeded} more days`);
  if (!engagement.hasSubscription) requirements.push('or subscribe for instant access');
  
  return {
    currentTier,
    nextTier: UserTier.POWER,
    progress,
    requirements,
  };
}

export default {
  UserTier,
  getUserTier,
  getAccessibleFeatures,
  canAccessFeature,
  getFeaturesByCategory,
  getLockedFeatures,
  getTierProgress,
  ALL_FEATURES,
};
