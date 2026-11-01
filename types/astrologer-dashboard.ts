/**
 * Astrologer Dashboard Types
 *
 * Shared types for the astrologer-side of the app. These power the
 * separate "Astrologer Console" — a dashboard where astrologers
 * manage their availability, accept consultations, track earnings,
 * and respond to messages.
 *
 * In production this is a separate Expo app sharing the same
 * Supabase backend. For development, it lives in the same monorepo
 * at `app-astrologer/` so the codebase stays unified.
 */

export type ConsultationStatus =
  | 'pending'      // user requested, awaiting astrologer acceptance
  | 'accepted'     // astrologer accepted, waiting for user to join
  | 'active'       // consultation in progress
  | 'completed'    // consultation finished successfully
  | 'cancelled'    // cancelled by either party
  | 'declined'     // astrologer declined
  | 'no_show';     // user didn't show up

export type ConsultationType = 'chat' | 'voice' | 'video';

export interface AstrologerConsultation {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userQuestion?: string;       // brief topic of the consultation
  type: ConsultationType;
  status: ConsultationStatus;
  pricePerMinute: number;
  scheduledAt?: string;         // ISO
  startedAt?: string;
  endedAt?: string;
  durationMinutes: number;
  totalAmount: number;
  rating?: number;              // 1-5
  review?: string;
  createdAt: string;
}

export interface AstrologerEarning {
  id: string;
  consultationId: string;
  userName: string;
  grossAmount: number;          // what user paid
  platformFee: number;          // 30% kept by AstroNemi
  netAmount: number;            // what astrologer receives
  status: 'pending' | 'paid' | 'processing';
  paidAt?: string;
  createdAt: string;
}

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;   // 0 = Sunday
  startTime: string;             // "HH:MM"
  endTime: string;               // "HH:MM"
  isRecurring: boolean;
}

export interface TimeOff {
  id: string;
  startDate: string;             // ISO
  endDate: string;               // ISO
  reason?: string;
}

export interface AstrologerStats {
  totalEarnings: number;         // all-time
  thisMonthEarnings: number;
  thisWeekEarnings: number;
  todayEarnings: number;
  totalConsultations: number;
  thisMonthConsultations: number;
  averageRating: number;
  totalReviews: number;
  responseTimeMinutes: number;   // avg time to accept
  completionRate: number;        // % of accepted consultations completed
  repeatClientRate: number;      // % of clients who come back
}

export interface RatingBreakdown {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface Review {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  consultationType: ConsultationType;
  createdAt: string;
}

export interface PayoutMethod {
  type: 'upi' | 'bank';
  upiId?: string;
  bankName?: string;
  accountLast4?: string;
  ifscLast4?: string;
  isVerified: boolean;
}

export interface AstrologerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  bio: string;
  experienceYears: number;
  specializations: string[];
  languages: string[];
  pricePerMinuteChat: number;
  pricePerMinuteVoice: number;
  pricePerMinuteVideo: number;
  isVerified: boolean;
  isOnline: boolean;
  isAvailableForChat: boolean;
  isAvailableForVoice: boolean;
  isAvailableForVideo: boolean;
  stats: AstrologerStats;
  ratingBreakdown: RatingBreakdown;
  payoutMethod?: PayoutMethod;
  totalUnpaidEarnings: number;
}
