/**
 * Consultation Entity Types
 * 
 * Consolidated consultation-related type definitions
 * Extends database types with computed fields and API variants
 */

import type { Database } from '@/lib/database.types';
import type { UserCard } from './user';
import type { AstrologerCard } from './astrologer';

// Base consultation type from database
export type Consultation = Database['public']['Tables']['consultations']['Row'];
export type ConsultationInsert = Database['public']['Tables']['consultations']['Insert'];
export type ConsultationUpdate = Database['public']['Tables']['consultations']['Update'];

// Chat message type from database
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert'];
export type ChatMessageUpdate = Database['public']['Tables']['chat_messages']['Update'];

// Consultation types
export type ConsultationType = 'chat' | 'call' | 'video';

// Consultation status
export type ConsultationStatus = 'pending' | 'active' | 'completed' | 'cancelled';

// Message sender type
export type MessageSenderType = 'user' | 'astrologer';

// Extended consultation with related data
export interface ConsultationDetails extends Consultation {
  // Related entities (when populated)
  user?: UserCard;
  astrologer?: AstrologerCard;
  messages?: ChatMessageDetails[];
  
  // Computed fields
  formattedDuration: string;
  formattedStartTime: string;
  formattedEndTime: string;
  canRate: boolean;
  canReview: boolean;
  isActive: boolean;
  isPending: boolean;
  isCompleted: boolean;
}

// Consultation summary for listings
export interface ConsultationSummary extends Pick<Consultation,
  'id' | 'type' | 'status' | 'start_time' | 'end_time' | 'duration_minutes' | 'total_amount' | 'user_rating' | 'created_at'
> {
  astrologerName: string;
  astrologerAvatar: string | null;
  userName?: string;
  userAvatar?: string | null;
  formattedDate: string;
  formattedTime: string;
  formattedDuration: string;
  statusLabel: string;
  canJoin: boolean;
  canRate: boolean;
}

// Chat message with extended details
export interface ChatMessageDetails extends ChatMessage {
  // Sender information
  senderName: string;
  senderAvatar: string | null;
  
  // Message metadata
  formattedTime: string;
  isOwn: boolean;
  canEdit: boolean;
  canDelete: boolean;
  
  // Message content
  messageType: 'text' | 'image' | 'file' | 'system';
  attachments?: MessageAttachment[];
}

// Message attachment
export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'audio';
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

// Consultation creation request
export interface CreateConsultationRequest {
  astrologerId: string;
  type: ConsultationType;
  scheduledAt?: string; // For scheduled consultations
  notes?: string;
  preferredLanguage?: string;
}

// Consultation booking response
export interface ConsultationBooking {
  consultation: ConsultationDetails;
  paymentRequired: boolean;
  estimatedCost: number;
  queuePosition?: number;
  estimatedWaitTime?: number; // in minutes
}

// Queue position information
export interface QueuePosition {
  position: number;
  estimatedWaitTime: number; // in minutes
  totalInQueue: number;
  averageConsultationTime: number; // in minutes
}

// Consultation filters for queries
export interface ConsultationFilters {
  userId?: string;
  astrologerId?: string;
  type?: ConsultationType;
  status?: ConsultationStatus;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  hasRating?: boolean;
  sortBy?: 'created_at' | 'start_time' | 'duration_minutes' | 'total_amount';
  sortOrder?: 'asc' | 'desc';
}

// Consultation rating and review
export interface ConsultationRating {
  consultationId: string;
  rating: number; // 1-5
  review?: string;
  categories?: {
    communication: number;
    accuracy: number;
    helpfulness: number;
    professionalism: number;
  };
  wouldRecommend: boolean;
}

// Consultation statistics
export interface ConsultationStats {
  total: number;
  completed: number;
  cancelled: number;
  averageDuration: number; // in minutes
  averageRating: number;
  totalSpent: number;
  favoriteAstrologers: string[]; // astrologer IDs
  preferredType: ConsultationType;
  mostActiveHours: number[]; // hours of day (0-23)
}

// Real-time consultation state
export interface ConsultationState {
  id: string;
  status: ConsultationStatus;
  participants: {
    user: {
      id: string;
      name: string;
      isOnline: boolean;
      lastSeen: string;
    };
    astrologer: {
      id: string;
      name: string;
      isOnline: boolean;
      lastSeen: string;
    };
  };
  startedAt: string | null;
  duration: number; // in seconds
  cost: number;
  messages: {
    total: number;
    unread: number;
    lastMessage: ChatMessageDetails | null;
  };
  call?: {
    channelName: string;
    token: string;
    isVideoEnabled: boolean;
    isAudioEnabled: boolean;
  };
}

// Consultation history item
export interface ConsultationHistoryItem {
  id: string;
  astrologerId: string;
  astrologerName: string;
  astrologerImage: string | null;
  type: ConsultationType;
  date: string;
  time: string;
  duration: string;
  amount: number;
  rating?: number;
  notes?: string;
  status: 'completed' | 'upcoming' | 'cancelled';
  canRebook: boolean;
  canRate: boolean;
  canViewTranscript: boolean;
}

// Send message request
export interface SendMessageRequest {
  consultationId: string;
  content: string;
  type?: 'text' | 'image' | 'file';
  attachments?: File[];
}

// Consultation analytics
export interface ConsultationAnalytics {
  period: 'day' | 'week' | 'month' | 'year';
  totalConsultations: number;
  totalRevenue: number;
  averageRating: number;
  completionRate: number;
  typeDistribution: Record<ConsultationType, number>;
  statusDistribution: Record<ConsultationStatus, number>;
  hourlyDistribution: Record<string, number>;
  topAstrologers: Array<{
    id: string;
    name: string;
    consultations: number;
    revenue: number;
    rating: number;
  }>;
}