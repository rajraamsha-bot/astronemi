/**
 * Astrologer Entity Types
 * 
 * Consolidated astrologer-related type definitions
 * Extends database types with computed fields and API variants
 */

import type { Database } from '@/lib/database.types';

// Base astrologer type from database
export type Astrologer = Database['public']['Tables']['astrologers']['Row'];
export type AstrologerInsert = Database['public']['Tables']['astrologers']['Insert'];
export type AstrologerUpdate = Database['public']['Tables']['astrologers']['Update'];

// Astrologer availability
export type AstrologerAvailability = Database['public']['Tables']['astrologer_availability']['Row'];

// Time slot structure
export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked?: boolean;
}

// Daily availability
export interface DayAvailability {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  dayName: string;
  slots: TimeSlot[];
  isAvailable: boolean;
}

// Astrologer specializations
export type AstrologerSpecialization = 
  | 'vedic_astrology'
  | 'numerology'
  | 'tarot'
  | 'palmistry'
  | 'vastu'
  | 'gemology'
  | 'kundli_matching'
  | 'career_guidance'
  | 'relationship_counseling'
  | 'health_astrology'
  | 'financial_astrology'
  | 'spiritual_guidance';

// Languages supported
export type SupportedLanguage = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'bn' | 'gu' | 'mr' | 'pa';

// Astrologer status
export interface AstrologerStatus {
  isOnline: boolean;
  isAvailable: boolean;
  isBusy: boolean;
  lastSeen: string | null;
  nextAvailable: string | null;
  currentConsultations: number;
  maxConcurrentConsultations: number;
}

// Astrologer statistics
export interface AstrologerStats {
  totalConsultations: number;
  totalReviews: number;
  averageRating: number;
  totalEarnings: number;
  responseTime: number; // in minutes
  completionRate: number; // percentage
  repeatClientRate: number; // percentage
  joinedDate: string;
}

// Extended astrologer profile with computed fields
export interface AstrologerProfile extends Astrologer {
  // Computed display fields
  displayName: string;
  avatarUrl: string | null;
  
  // Status information
  status: AstrologerStatus;
  
  // Statistics
  stats: AstrologerStats;
  
  // Related data (when populated)
  availability?: DayAvailability[];
  reviews?: AstrologerReview[];
  
  // Pricing information
  pricing: {
    chatPerMinute: number;
    callPerMinute: number;
    videoPerMinute: number;
    discountPercentage?: number;
    specialOffers?: string[];
  };
}

// Astrologer card for listings (lighter version)
export interface AstrologerCard extends Pick<Astrologer,
  'id' | 'name' | 'avatar_url' | 'expertise' | 'specializations' | 
  'languages' | 'experience_years' | 'rating' | 'total_reviews' | 
  'price_per_minute' | 'is_verified' | 'is_online' | 'is_available'
> {
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  nextAvailable: string | null;
  discountPrice?: number;
}

// Astrologer review
export interface AstrologerReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  rating: number;
  comment: string;
  consultationType: 'chat' | 'call' | 'video';
  consultationDate: string;
  isVerified: boolean;
  helpful: number;
  createdAt: string;
}

// Astrologer search filters
export interface AstrologerFilters {
  specializations?: AstrologerSpecialization[];
  languages?: SupportedLanguage[];
  minRating?: number;
  maxRating?: number;
  minPrice?: number;
  maxPrice?: number;
  minExperience?: number;
  maxExperience?: number;
  isOnline?: boolean;
  isAvailable?: boolean;
  isVerified?: boolean;
  sortBy?: 'rating' | 'price' | 'experience' | 'popularity' | 'newest';
  sortOrder?: 'asc' | 'desc';
}

// Astrologer onboarding data
export interface AstrologerOnboarding {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    address: string;
  };
  professionalInfo: {
    expertise: string;
    specializations: AstrologerSpecialization[];
    languages: SupportedLanguage[];
    experienceYears: number;
    qualifications: string[];
    certifications: string[];
  };
  documents: {
    photo: string;
    idProof: string;
    certificates: string[];
  };
  pricing: {
    chatPerMinute: number;
    callPerMinute: number;
    videoPerMinute: number;
  };
  availability: DayAvailability[];
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };
}

// Astrologer dashboard metrics
export interface AstrologerDashboard {
  todayStats: {
    consultations: number;
    earnings: number;
    averageRating: number;
    onlineHours: number;
  };
  weekStats: {
    consultations: number;
    earnings: number;
    newClients: number;
    repeatClients: number;
  };
  monthStats: {
    consultations: number;
    earnings: number;
    totalClients: number;
    averageRating: number;
  };
  recentReviews: AstrologerReview[];
  upcomingConsultations: Record<string, unknown>[]; // Will be defined in consultation types
}