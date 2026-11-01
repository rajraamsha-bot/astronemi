/**
 * API Types
 * 
 * Type definitions for API requests and responses
 */

// ============================================
// COMMON TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// ============================================
// AUTH TYPES
// ============================================

export interface SendOtpRequest {
  phone: string;
  countryCode?: string;
}

export interface SendOtpResponse {
  message: string;
  expiresIn: number;
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
  countryCode?: string;
}

export interface VerifyOtpResponse {
  user: User;
  token: string;
  refreshToken: string;
  isNewUser: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

export interface User {
  id: string;
  phone: string;
  email?: string;
  name?: string;
  avatar?: string;
  dateOfBirth?: string;
  timeOfBirth?: string;
  placeOfBirth?: string;
  latitude?: number;
  longitude?: number;
  timezone?: number;
  gender?: 'male' | 'female' | 'other';
  language?: string;
  notificationsEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ASTROLOGER TYPES
// ============================================

export interface Astrologer {
  id: string;
  name: string;
  avatar: string;
  specialization: string[];
  languages: string[];
  experience: number;
  rating: number;
  totalReviews: number;
  price: number;
  discountPrice?: number;
  isOnline: boolean;
  isVerified: boolean;
  about: string;
  skills: string[];
  availability: Availability[];
  nextAvailable?: string;
}

export interface Availability {
  day: string;
  slots: TimeSlot[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface AstrologerFilters extends PaginationParams {
  specialization?: string[];
  language?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  isOnline?: boolean;
  sortBy?: 'rating' | 'price' | 'experience' | 'popularity';
}

export interface AstrologerDetails extends Astrologer {
  reviews: Review[];
  articles: Article[];
  videos: Video[];
}

// ============================================
// CONSULTATION TYPES
// ============================================

export type ConsultationType = 'chat' | 'call' | 'video';
export type ConsultationStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Consultation {
  id: string;
  userId: string;
  astrologerId: string;
  astrologer: Astrologer;
  type: ConsultationType;
  status: ConsultationStatus;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  price: number;
  rating?: number;
  review?: string;
  recording?: string;
  transcript?: string;
  createdAt: string;
}

export interface CreateConsultationRequest {
  astrologerId: string;
  type: ConsultationType;
  scheduledAt?: string;
}

export interface StartConsultationRequest {
  consultationId: string;
}

export interface EndConsultationRequest {
  consultationId: string;
  rating?: number;
  review?: string;
}

// ============================================
// CHAT TYPES
// ============================================

export interface ChatMessage {
  id: string;
  consultationId: string;
  senderId: string;
  senderType: 'user' | 'astrologer';
  content: string;
  type: 'text' | 'image' | 'file';
  mediaUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface SendMessageRequest {
  consultationId: string;
  content: string;
  type?: 'text' | 'image' | 'file';
  mediaUrl?: string;
}

// ============================================
// KUNDLI TYPES
// ============================================

export interface KundliRequest {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: number;
  gender?: 'male' | 'female' | 'other';
}

export interface Kundli {
  id: string;
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: number;
  gender: string;
  ascendant: Rashi;
  moonSign: Rashi;
  sunSign: Rashi;
  planets: PlanetPosition[];
  houses: HousePosition[];
  nakshatra: NakshatraInfo;
  yogas: Yoga[];
  dasha: DashaInfo;
  createdAt: string;
}

export interface Rashi {
  id: number;
  name: string;
  hindiName: string;
  lord: string;
  degrees: number;
}

export interface PlanetPosition {
  name: string;
  hindiName: string;
  rashi: string;
  rashiId: number;
  degrees: number;
  isRetrograde: boolean;
  nakshatra: string;
  nakshatraPada: number;
  house: number;
}

export interface HousePosition {
  number: number;
  sign: string;
  lord: string;
  planets: string[];
  degrees: number;
}

export interface NakshatraInfo {
  name: string;
  hindiName: string;
  pada: number;
  lord: string;
  deity: string;
  symbol: string;
}

export interface Yoga {
  name: string;
  hindiName: string;
  type: string;
  strength: string;
  description: string;
  planets: string[];
}

export interface DashaInfo {
  current: DashaPeriod;
  antardasha: DashaPeriod;
  pratyantardasha?: DashaPeriod;
}

export interface DashaPeriod {
  planet: string;
  startDate: string;
  endDate: string;
  remaining: string;
}

// ============================================
// MATCHING TYPES
// ============================================

export interface KundliMatchingRequest {
  boy: KundliRequest;
  girl: KundliRequest;
}

export interface KundliMatchingResult {
  boy: Kundli;
  girl: Kundli;
  score: MatchingScore;
  conclusion: MatchingConclusion;
}

export interface MatchingScore {
  total: number;
  maximum: number;
  percentage: number;
  kutas: KutaResult[];
}

export interface KutaResult {
  name: string;
  hindiName: string;
  boyValue: string;
  girlValue: string;
  points: number;
  maxPoints: number;
  description: string;
  isMatching: boolean;
}

export interface MatchingConclusion {
  isCompatible: boolean;
  recommendation: string;
  doshas: string[];
  remedies: string[];
}

// ============================================
// HOROSCOPE TYPES
// ============================================

export type HoroscopePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface HoroscopeRequest {
  sign: string;
  period: HoroscopePeriod;
  date?: string;
}

export interface Horoscope {
  sign: string;
  hindiName: string;
  period: HoroscopePeriod;
  date: string;
  prediction: string;
  luckyNumber: number[];
  luckyColor: string;
  mood: string;
  compatibility: string;
  career: string;
  love: string;
  health: string;
  finance: string;
  rating: {
    overall: number;
    career: number;
    love: number;
    health: number;
    finance: number;
  };
}

// ============================================
// PANCHANGE TYPES
// ============================================

export interface PanchangRequest {
  date: string;
  latitude: number;
  longitude: number;
  timezone: number;
}

export interface Panchang {
  date: string;
  tithi: TithiInfo;
  nakshatra: NakshatraInfo;
  yoga: YogaInfo;
  karana: KaranaInfo;
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  rahuKaal: TimePeriod;
  gulikaKaal: TimePeriod;
  yamagandaKaal: TimePeriod;
  abhijitMuhurta: TimePeriod;
  amritKaal: TimePeriod[];
  festivals: Festival[];
  holidays: string[];
}

export interface TithiInfo {
  name: string;
  hindiName: string;
  paksha: string;
  endTime: string;
  deity: string;
}

export interface YogaInfo {
  name: string;
  hindiName: string;
  endTime: string;
  meaning: string;
}

export interface KaranaInfo {
  name: string;
  hindiName: string;
  endTime: string;
  type: string;
}

export interface TimePeriod {
  name: string;
  startTime: string;
  endTime: string;
}

export interface Festival {
  name: string;
  hindiName: string;
  type: string;
  importance: string;
}

// ============================================
// MUHURAT TYPES
// ============================================

export type MuhuratType = 
  | 'marriage'
  | 'griha_pravesh'
  | 'vehicle_purchase'
  | 'property_purchase'
  | 'business_start'
  | 'travel'
  | 'education'
  | 'job_interview'
  | 'naming_ceremony'
  | 'mundan'
  | 'upanayanam';

export interface MuhuratRequest {
  type: MuhuratType;
  startDate: string;
  endDate: string;
  latitude: number;
  longitude: number;
  timezone: number;
}

export interface Muhurat {
  date: string;
  startTime: string;
  endTime: string;
  quality: 'excellent' | 'good' | 'average';
  score: number;
  tithi: string;
  nakshatra: string;
  yoga: string;
  karana: string;
  notes: string[];
}

// ============================================
// PAYMENT TYPES
// ============================================

export type PaymentMethod = 'razorpay' | 'wallet' | 'upi' | 'card' | 'netbanking';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface CreateOrderRequest {
  amount: number;
  currency?: string;
  type: 'consultation' | 'subscription' | 'wallet' | 'product';
  referenceId?: string;
  couponCode?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  key: string;
  razorpayOrderId: string;
}

export interface VerifyPaymentRequest {
  orderId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// WALLET TYPES
// ============================================

export interface Wallet {
  balance: number;
  pendingBalance: number;
  totalAdded: number;
  totalSpent: number;
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  balance: number;
  description: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
}

export interface TopUpWalletRequest {
  amount: number;
}

// ============================================
// SUBSCRIPTION TYPES
// ============================================

export type SubscriptionPlan = 'free' | 'basic' | 'premium' | 'elite';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'paused';

export interface Subscription {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  price: number;
  features: string[];
  consultationsRemaining: number;
  consultationsTotal: number;
}

export interface SubscriptionPlanDetails {
  id: SubscriptionPlan;
  name: string;
  hindiName: string;
  price: number;
  originalPrice?: number;
  duration: number;
  durationUnit: 'month' | 'year';
  features: string[];
  consultations: number;
  discount?: number;
  isPopular?: boolean;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export type NotificationType = 
  | 'consultation_reminder'
  | 'consultation_starting'
  | 'horoscope_daily'
  | 'festival_reminder'
  | 'payment_success'
  | 'payment_failed'
  | 'subscription_renewal'
  | 'promotion'
  | 'chat_message'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ============================================
// REVIEW TYPES
// ============================================

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  astrologerId: string;
  rating: number;
  comment: string;
  consultationType: ConsultationType;
  isVerified: boolean;
  helpful: number;
  createdAt: string;
}

export interface CreateReviewRequest {
  astrologerId: string;
  consultationId: string;
  rating: number;
  comment: string;
}

// ============================================
// BLOG/ARTICLE TYPES
// ============================================

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string[];
  author: Author;
  readTime: number;
  views: number;
  likes: number;
  isFeatured: boolean;
  publishedAt: string;
}

export interface Author {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  isAstrologer: boolean;
}

// ============================================
// VIDEO TYPES
// ============================================

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  duration: number;
  views: number;
  likes: number;
  category: string;
  astrologer: Astrologer;
  isLive: boolean;
  scheduledAt?: string;
  createdAt: string;
}

// ============================================
// PRODUCT/SHOP TYPES
// ============================================

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  category: string;
  stock: number;
  rating: number;
  totalReviews: number;
  isAvailable: boolean;
  specifications: Record<string, string>;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

// ============================================
// REFERRAL TYPES
// ============================================

export interface Referral {
  code: string;
  link: string;
  totalReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
}

export interface ReferralTransaction {
  id: string;
  referredUser: string;
  status: 'pending' | 'completed' | 'cancelled';
  amount: number;
  createdAt: string;
}

// ============================================
// SUPPORT/TICKET TYPES
// ============================================

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  id: string;
  senderId: string;
  senderType: 'user' | 'support';
  content: string;
  attachments: string[];
  createdAt: string;
}

// ============================================
// CONFIGURATION TYPES
// ============================================

export interface AppConfig {
  minAppVersion: string;
  maintenanceMode: boolean;
  features: FeatureFlags;
  paymentMethods: PaymentMethod[];
  supportContact: SupportContact;
  socialLinks: SocialLinks;
}

export interface FeatureFlags {
  chat: boolean;
  videoCall: boolean;
  voiceCall: boolean;
  wallet: boolean;
  subscription: boolean;
  referral: boolean;
  shop: boolean;
  blog: boolean;
  courses: boolean;
  podcasts: boolean;
  community: boolean;
}

export interface SupportContact {
  email: string;
  phone: string;
  whatsapp: string;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  linkedin?: string;
}

// ============================================
// EXPORT ALL
// ============================================
export default {
  // Re-export types for convenience
};
