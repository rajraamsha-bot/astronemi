/**
 * API Request Types
 * 
 * Standardized request types for all API endpoints
 */

// Base pagination parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

// Base sorting parameters
export interface SortingParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Base filtering parameters
export interface FilterParams {
  [key: string]: string | number | boolean | string[] | number[] | Record<string, any> | undefined;
}

// Combined query parameters
export interface QueryParams extends PaginationParams, SortingParams, FilterParams {}

// Search parameters
export interface SearchParams extends QueryParams {
  query: string;
  fields?: string[]; // Fields to search in
  fuzzy?: boolean;
  highlight?: boolean;
  facets?: string[];
}

// Date range parameters
export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
  period?: 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

// Geolocation parameters
export interface LocationParams {
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers
  city?: string;
  state?: string;
  country?: string;
}

// File upload parameters
export interface UploadParams {
  file: File | Blob;
  filename?: string;
  folder?: string;
  public?: boolean;
  maxSize?: number;
  allowedTypes?: string[];
}

// Bulk operation parameters
export interface BulkParams<T> {
  items: T[];
  operation: 'create' | 'update' | 'delete';
  options?: {
    continueOnError?: boolean;
    validateOnly?: boolean;
    batchSize?: number;
  };
}

// Authentication requests
export interface LoginRequest {
  phone: string;
  countryCode?: string;
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
  countryCode?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// User requests
export interface CreateUserRequest {
  phone: string;
  name?: string;
  email?: string;
  referralCode?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  avatar?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  latitude?: number;
  longitude?: number;
  language?: string;
  notificationsEnabled?: boolean;
}

// Astrologer requests
export interface AstrologerSearchRequest extends QueryParams {
  specializations?: string[];
  languages?: string[];
  minRating?: number;
  maxRating?: number;
  minPrice?: number;
  maxPrice?: number;
  minExperience?: number;
  isOnline?: boolean;
  isAvailable?: boolean;
  location?: LocationParams;
}

export interface CreateAstrologerRequest {
  name: string;
  email: string;
  phone: string;
  expertise: string;
  specializations: string[];
  languages: string[];
  experienceYears: number;
  pricePerMinute: number;
  bio?: string;
  qualifications?: string[];
  documents: {
    photo: string;
    idProof: string;
    certificates: string[];
  };
}

// Consultation requests
export interface CreateConsultationRequest {
  astrologerId: string;
  type: 'chat' | 'call' | 'video';
  scheduledAt?: string;
  notes?: string;
  preferredLanguage?: string;
}

export interface UpdateConsultationRequest {
  status?: 'active' | 'completed' | 'cancelled';
  rating?: number;
  review?: string;
  notes?: string;
}

export interface SendMessageRequest {
  consultationId: string;
  content: string;
  type?: 'text' | 'image' | 'file';
  attachments?: UploadParams[];
}

// Payment requests
export interface CreatePaymentOrderRequest {
  amount: number;
  currency?: string;
  type: 'consultation' | 'subscription' | 'wallet' | 'product';
  referenceId?: string;
  couponCode?: string;
  notes?: string;
}

export interface VerifyPaymentRequest {
  orderId: string;
  paymentId: string;
  signature: string;
  provider: 'razorpay' | 'paytm' | 'phonepe';
}

export interface RefundRequest {
  transactionId: string;
  amount?: number;
  reason: string;
  notes?: string;
}

// Wallet requests
export interface TopUpWalletRequest {
  amount: number;
  paymentMethod: 'razorpay' | 'upi' | 'card' | 'netbanking';
  promoCode?: string;
}

export interface TransferWalletRequest {
  toUserId: string;
  amount: number;
  notes?: string;
}

// Kundli requests
export interface GenerateKundliRequest {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  gender?: 'male' | 'female' | 'other';
}

export interface KundliMatchingRequest {
  boy: GenerateKundliRequest;
  girl: GenerateKundliRequest;
}

// Horoscope requests
export interface HoroscopeRequest {
  sign: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  date?: string;
  language?: string;
}

// Panchang requests
export interface PanchangRequest {
  date: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

// Subscription requests
export interface CreateSubscriptionRequest {
  planId: string;
  paymentMethod: string;
  couponCode?: string;
  autoRenew?: boolean;
}

export interface UpdateSubscriptionRequest {
  autoRenew?: boolean;
  paymentMethod?: string;
}

// Review requests
export interface CreateReviewRequest {
  consultationId: string;
  astrologerId: string;
  rating: number;
  comment?: string;
  categories?: {
    communication: number;
    accuracy: number;
    helpfulness: number;
    professionalism: number;
  };
  wouldRecommend?: boolean;
}

// Notification requests
export interface UpdateNotificationRequest {
  isRead?: boolean;
  action?: string;
}

export interface NotificationPreferencesRequest {
  dailyHoroscope?: boolean;
  consultationReminders?: boolean;
  promotionalOffers?: boolean;
  astrologerMessages?: boolean;
  pushNotifications?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
}

// Analytics requests
export interface AnalyticsRequest extends DateRangeParams {
  metrics: string[];
  dimensions?: string[];
  filters?: FilterParams;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  compare?: boolean;
}

// Export requests
export interface ExportRequest extends QueryParams, DateRangeParams {
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  fields?: string[];
  template?: string;
}

// Webhook requests
export interface WebhookRequest {
  url: string;
  events: string[];
  secret?: string;
  active?: boolean;
  headers?: Record<string, string>;
}
