/**
 * User Entity Types
 * 
 * Consolidated user-related type definitions
 * Extends database types with computed fields and API variants
 */

import type { Database } from '@/lib/database.types';

// Base user type from database
export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

// Birth details structure
export interface BirthDetails {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
  timezone?: string;
}

// User subscription information
export interface UserSubscription {
  id: string;
  plan: 'free' | 'basic' | 'premium' | 'gold';
  status: 'active' | 'cancelled' | 'expired' | 'paused';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  features: string[];
  consultationsRemaining: number;
  consultationsTotal: number;
}

// User statistics
export interface UserStats {
  totalConsultations: number;
  totalSpent: number;
  averageRating: number;
  joinedDate: string;
  lastActive: string;
}

// Notification preferences
export interface NotificationSettings {
  dailyHoroscope: boolean;
  dailyHoroscopeTime: string;
  festivalReminders: boolean;
  muhuratAlerts: boolean;
  transitAlerts: boolean;
  walletLowBalance: boolean;
  promotionalOffers: boolean;
  astrologerMessages: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

// Referral information
export interface ReferralStats {
  code: string;
  totalReferrals: number;
  successfulReferrals: number;
  earnedCredits: number;
  pendingCredits: number;
  link: string;
}

// Extended user profile with computed fields
export interface UserProfile extends User {
  // Computed display fields
  displayName: string;
  avatarUrl: string | null;
  isProfileComplete: boolean;
  
  // Structured birth details
  birthDetails: BirthDetails | null;
  
  // Related data (when populated)
  subscription: UserSubscription | null;
  stats: UserStats;
  notifications: NotificationSettings;
  referral: ReferralStats;
}

// Saved Kundli information
export interface SavedKundli {
  id: string;
  name: string;
  relation: 'self' | 'spouse' | 'child' | 'parent' | 'sibling' | 'other';
  birthDetails: BirthDetails;
  createdAt: string;
  kundliData?: Record<string, unknown>; // Kundli calculation data
}

// User profile for API responses (lighter version)
export interface UserCard extends Pick<User, 
  'id' | 'name' | 'avatar_url' | 'zodiac_sign' | 'created_at'
> {
  displayName: string;
  avatarUrl: string | null;
}

// User profile update payload
export interface UserProfileUpdate {
  name?: string;
  email?: string;
  avatar_url?: string;
  birth_date?: string;
  birth_time?: string;
  birth_place?: string;
  birth_lat?: number;
  birth_lng?: number;
  language?: 'en' | 'hi' | 'ta' | 'te' | 'kn';
  notifications_enabled?: boolean;
}

// Authentication-related types
export interface AuthUser extends Pick<User,
  'id' | 'phone' | 'email' | 'name' | 'avatar_url' | 'created_at'
> {
  isNewUser: boolean;
  token: string;
  refreshToken: string;
}

// User search/filter types
export interface UserFilters {
  name?: string;
  email?: string;
  phone?: string;
  subscription_tier?: 'free' | 'basic' | 'premium' | 'gold';
  created_after?: string;
  created_before?: string;
}