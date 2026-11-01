/**
 * Entity Types Index
 * 
 * Centralized exports for all entity type definitions
 */

// User types
export type {
  User,
  UserInsert,
  UserUpdate,
  BirthDetails,
  UserSubscription,
  UserStats,
  NotificationSettings,
  ReferralStats,
  UserProfile,
  SavedKundli,
  UserCard,
  UserProfileUpdate,
  AuthUser,
  UserFilters,
} from './user';

// Astrologer types
export type {
  Astrologer,
  AstrologerInsert,
  AstrologerUpdate,
  AstrologerAvailability,
  TimeSlot,
  DayAvailability,
  AstrologerSpecialization,
  SupportedLanguage,
  AstrologerStatus,
  AstrologerStats,
  AstrologerProfile,
  AstrologerCard,
  AstrologerReview,
  AstrologerFilters,
  AstrologerOnboarding,
  AstrologerDashboard,
} from './astrologer';

// Consultation types
export type {
  Consultation,
  ConsultationInsert,
  ConsultationUpdate,
  ChatMessage,
  ChatMessageInsert,
  ChatMessageUpdate,
  ConsultationType,
  ConsultationStatus,
  MessageSenderType,
  ConsultationDetails,
  ConsultationSummary,
  ChatMessageDetails,
  MessageAttachment,
  CreateConsultationRequest,
  ConsultationBooking,
  QueuePosition,
  ConsultationFilters,
  ConsultationRating,
  ConsultationStats,
  ConsultationState,
  ConsultationHistoryItem,
  SendMessageRequest,
  ConsultationAnalytics,
} from './consultation';

// Transaction types
export type {
  WalletTransaction,
  WalletTransactionInsert,
  WalletTransactionUpdate,
  TransactionType,
  TransactionSource,
  PaymentStatus,
  PaymentMethod,
  TransactionDetails,
  TransactionSummary,
  WalletInfo,
  TopUpRequest,
  PaymentOrder,
  RazorpayOptions,
  PaymentVerificationRequest,
  PaymentVerificationResponse,
  TransactionFilters,
  TransactionStats,
  RefundRequest,
  RefundResponse,
  PromoCode,
  PromoCodeValidation,
  TransactionReceipt,
  SubscriptionTransaction,
  ConsultationTransaction,
} from './transaction';

// Re-export database types for convenience
export type { Database } from '@/lib/database.types';