export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  birthDetails: BirthDetails;
  savedKundlis: SavedKundli[];
  referralCode: string;
  referredBy?: string;
  walletBalance: number;
  subscription?: Subscription;
  notifications: NotificationSettings;
  createdAt: Date;
}

export interface BirthDetails {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface SavedKundli {
  id: string;
  name: string;
  relation: 'self' | 'spouse' | 'child' | 'parent' | 'sibling' | 'other';
  birthDetails: BirthDetails;
  createdAt: Date;
  data?: Record<string, unknown>; // Kundli data
}

export interface Subscription {
  id: string;
  plan: 'free' | 'basic' | 'premium' | 'gold';
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  features: string[];
}

export interface NotificationSettings {
  dailyHoroscope: boolean;
  dailyHoroscopeTime: string;
  festivalReminders: boolean;
  muhuratAlerts: boolean;
  transitAlerts: boolean;
  walletLowBalance: boolean;
  promotionalOffers: boolean;
  astrologerMessages: boolean;
}

export interface ReferralStats {
  code: string;
  totalReferrals: number;
  successfulReferrals: number;
  earnedCredits: number;
  pendingCredits: number;
}

export interface Review {
  id: string;
  astrologerId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  consultationType: 'chat' | 'call' | 'video';
  createdAt: Date;
  helpful: number;
}
