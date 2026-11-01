/**
 * Supabase Database Types
 * 
 * These types correspond to the database schema.
 * Run the SQL migration in Supabase SQL Editor to create tables.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          phone: string | null
          email: string | null
          name: string | null
          display_name: string | null
          avatar_url: string | null
          birth_date: string | null
          birth_time: string | null
          birth_place: string | null
          birth_lat: number | null
          birth_lng: number | null
          zodiac_sign: string | null
          nakshatra: string | null
          subscription_tier: 'free' | 'basic' | 'premium' | 'gold'
          subscription_ends_at: string | null
          wallet_balance: number
          referral_code: string
          referred_by: string | null
          referral_earnings: number
          language: 'en' | 'hi' | 'ta' | 'te' | 'kn'
          notifications_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phone?: string | null
          email?: string | null
          name?: string | null
          display_name?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_time?: string | null
          birth_place?: string | null
          birth_lat?: number | null
          birth_lng?: number | null
          zodiac_sign?: string | null
          nakshatra?: string | null
          subscription_tier?: 'free' | 'basic' | 'premium' | 'gold',
          subscription_ends_at?: string | null,
          wallet_balance?: number,
          referral_code?: string,
          referred_by?: string | null,
          referral_earnings?: number,
          language?: 'en' | 'hi' | 'ta' | 'te' | 'kn',
          notifications_enabled?: boolean,
        }
        Update: {
          phone?: string | null
          email?: string | null
          name?: string | null
          display_name?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_time?: string | null
          birth_place?: string | null
          birth_lat?: number | null
          birth_lng?: number | null
          zodiac_sign?: string | null
          nakshatra?: string | null
          subscription_tier?: 'free' | 'basic' | 'premium' | 'gold',
          subscription_ends_at?: string | null,
          wallet_balance?: number
          referral_code?: string
          referred_by?: string | null
          referral_earnings?: number
          language?: 'en' | 'hi' | 'ta' | 'te' | 'kn'
          notifications_enabled?: boolean
        }
      }
      kundlis: {
        Row: {
          id: string
          user_id: string
          name: string
          birth_date: string
          birth_time: string
          birth_place: string
          birth_lat: number
          birth_lng: number
          kundli_data: Json
          ascendant_sign: string
          moon_sign: string
          sun_sign: string
          mangal_dosha: boolean
          calculation_source: 'vedastro' | 'fallback'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          birth_date: string
          birth_time: string
          birth_place: string
          birth_lat: number
          birth_lng: number
          kundli_data: Json
          ascendant_sign: string
          moon_sign: string
          sun_sign: string
          mangal_dosha: boolean
          calculation_source?: 'vedastro' | 'fallback'
        }
        Update: {
          name?: string
          kundli_data?: Json
        }
      }
      astrologers: {
        Row: {
          id: string
          user_id: string | null
          name: string
          avatar_url: string | null
          expertise: string
          specializations: string[]
          languages: string[]
          experience_years: number
          rating: number
          total_reviews: number
          total_consultations: number
          price_per_minute: number
          is_verified: boolean
          is_online: boolean
          is_available: boolean
          is_ai: boolean
          bio: string | null
          available_from: string | null
          available_to: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          avatar_url?: string | null
          expertise: string
          specializations: string[]
          languages: string[]
          experience_years: number
          rating?: number
          total_reviews?: number
          total_consultations?: number
          price_per_minute: number
          is_verified?: boolean
          is_online?: boolean
          is_available?: boolean
          is_ai?: boolean
          bio?: string | null
          available_from?: string | null
          available_to?: string | null
        }
        Update: {
          name?: string
          avatar_url?: string | null
          expertise?: string
          specializations?: string[]
          languages?: string[]
          experience_years?: number
          rating?: number
          total_reviews?: number
          total_consultations?: number
          price_per_minute?: number
          is_verified?: boolean
          is_online?: boolean
          is_available?: boolean
          is_ai?: boolean
          bio?: string | null
          available_from?: string | null
          available_to?: string | null
        }
      }
      consultations: {
        Row: {
          id: string
          user_id: string
          astrologer_id: string
          type: 'chat' | 'call' | 'video'
          status: 'pending' | 'accepted' | 'active' | 'completed' | 'cancelled' | 'declined'
          start_time: string | null
          end_time: string | null
          scheduled_at: string | null
          duration_minutes: number
          total_amount: number
          user_rating: number | null
          user_review: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          astrologer_id: string
          type: 'chat' | 'call' | 'video'
          status?: 'pending' | 'accepted' | 'active' | 'completed' | 'cancelled' | 'declined'
          start_time?: string | null
          end_time?: string | null
          scheduled_at?: string | null
          duration_minutes?: number
          total_amount?: number
          user_rating?: number | null
          user_review?: string | null
        }
        Update: {
          status?: 'pending' | 'accepted' | 'active' | 'completed' | 'cancelled' | 'declined'
          start_time?: string | null
          end_time?: string | null
          scheduled_at?: string | null
          duration_minutes?: number
          total_amount?: number
          user_rating?: number | null
          user_review?: string | null
        }
      }
      chat_messages: {
        Row: {
          id: string
          consultation_id: string
          sender_type: 'user' | 'astrologer'
          sender_id: string
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          consultation_id: string
          sender_type: 'user' | 'astrologer'
          sender_id: string
          message: string
          is_read?: boolean
        }
        Update: {
          is_read?: boolean
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          plan_name: string
          amount: number
          currency: string
          payment_id: string | null
          payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
          start_date: string
          end_date: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          plan_name: string
          amount: number
          currency?: string
          payment_id?: string | null
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded'
          start_date: string
          end_date: string
          is_active?: boolean
        }
        Update: {
          payment_id?: string | null
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded'
          is_active?: boolean
        }
      }
      wallet_transactions: {
        Row: {
          id: string
          user_id: string
          type: 'credit' | 'debit'
          amount: number
          balance_after: number
          source: 'topup' | 'refund' | 'referral' | 'consultation' | 'subscription'
          reference_id: string | null
          payment_id: string | null
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'credit' | 'debit'
          amount: number
          balance_after: number
          source: 'topup' | 'refund' | 'referral' | 'consultation' | 'subscription'
          reference_id?: string | null
          payment_id?: string | null
          description: string
        }
        Update: {}
      }
      orders: {
        Row: {
          id: string
          user_id: string
          items: Json
          total_amount: number
          status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
          shipping_address: Json
          payment_id: string | null
          payment_status: 'pending' | 'completed' | 'failed'
          tracking_number: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          items: Json
          total_amount: number
          status?: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
          shipping_address: Json
          payment_id?: string | null
          payment_status?: 'pending' | 'completed' | 'failed'
          tracking_number?: string | null
          notes?: string | null
        }
        Update: {
          status?: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
          payment_id?: string | null
          payment_status?: 'pending' | 'completed' | 'failed'
          tracking_number?: string | null
          notes?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'consultation' | 'subscription' | 'wallet' | 'horoscope' | 'transit' | 'promo'
          title: string
          message: string
          data: Json | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'consultation' | 'subscription' | 'wallet' | 'horoscope' | 'transit' | 'promo'
          title: string
          message: string
          data?: Json | null
          is_read?: boolean
        }
        Update: {
          is_read?: boolean
        }
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string
          reward_amount: number
          status: 'pending' | 'credited'
          created_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id: string
          reward_amount: number
          status?: 'pending' | 'credited'
        }
        Update: {
          status?: 'pending' | 'credited'
        }
      }
      kundli_matches: {
        Row: {
          id: string
          user_id: string
          boy_kundli_id: string
          girl_kundli_id: string
          total_score: number
          max_score: number
          varna_score: number
          vashya_score: number
          tara_score: number
          yoni_score: number
          graha_maitri_score: number
          gana_score: number
          bhakoot_score: number
          nadi_score: number
          mangal_dosha_boy: boolean
          mangal_dosha_girl: boolean
          compatibility_report: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          boy_kundli_id: string
          girl_kundli_id: string
          total_score: number
          max_score?: number
          varna_score: number
          vashya_score: number
          tara_score: number
          yoni_score: number
          graha_maitri_score: number
          gana_score: number
          bhakoot_score: number
          nadi_score: number
          mangal_dosha_boy: boolean
          mangal_dosha_girl: boolean
          compatibility_report?: Json
        }
        Update: {}
      }
      horoscopes: {
        Row: {
          id: string
          sign: string
          period: 'daily' | 'weekly' | 'monthly' | 'yearly'
          date: string
          prediction: string
          overall_rating?: number | null
          rating?: number
          lucky_color?: string | null
          luck_color?: string | null
          lucky_numbers?: number[] | null
          luck_number?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sign: string
          period: 'daily' | 'weekly' | 'monthly' | 'yearly'
          date: string
          prediction: string
          overall_rating?: number | null
          rating?: number
          lucky_color?: string | null
          luck_color?: string | null
          lucky_numbers?: number[] | null
          luck_number?: string | null
        }
        Update: {
          prediction?: string
          overall_rating?: number | null
          rating?: number
        }
      }
      reviews: {
        Row: {
          id: string
          astrologer_id: string
          user_id: string
          user_name: string | null
          user_avatar: string | null
          rating: number
          comment: string | null
          consultation_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          astrologer_id: string
          user_id: string
          user_name?: string | null
          user_avatar?: string | null
          rating: number
          comment?: string | null
          consultation_type?: string | null
        }
        Update: {
          user_name?: string | null
          user_avatar?: string | null
          rating?: number
          comment?: string | null
          consultation_type?: string | null
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          category: string
          image_url: string | null
          stock_quantity: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          category: string
          image_url?: string | null
          stock_quantity: number
          is_active?: boolean
        }
        Update: {
          price?: number
          stock_quantity?: number
          is_active?: boolean
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Update: {}
      }
      astrologer_availability: {
        Row: {
          id: string
          astrologer_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available: boolean
        }
        Insert: {
          id?: string
          astrologer_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available?: boolean
        }
        Update: {
          is_available?: boolean
        }
      }
      astrologer_earnings: {
        Row: {
          id: string
          astrologer_id: string
          consultation_id: string | null
          user_name: string | null
          gross_amount: number
          platform_fee: number
          net_amount: number
          status: string
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          astrologer_id: string
          consultation_id?: string | null
          user_name?: string | null
          gross_amount: number
          platform_fee: number
          net_amount: number
          status?: string
          paid_at?: string | null
        }
        Update: {
          status?: string
          paid_at?: string | null
        }
      }
      availability_slots: {
        Row: {
          id: string
          astrologer_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_recurring: boolean
          created_at: string
        }
        Insert: {
          id?: string
          astrologer_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_recurring?: boolean
        }
        Update: {
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_recurring?: boolean
        }
      }
      astrologer_time_off: {
        Row: {
          id: string
          astrologer_id: string
          start_date: string
          end_date: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          astrologer_id: string
          start_date: string
          end_date: string
          reason?: string | null
        }
        Update: {
          reason?: string | null
        }
      }
      astrologer_stats: {
        Row: {
          astrologer_id: string
          total_earnings: number
          this_month_earnings: number
          this_week_earnings: number
          today_earnings: number
          total_consultations: number
          this_month_consultations: number
          average_rating: number
          total_reviews: number
          response_time_minutes: number
          completion_rate: number
          repeat_client_rate: number
          updated_at: string
        }
        Insert: {
          astrologer_id: string
          total_earnings?: number
          this_month_earnings?: number
          this_week_earnings?: number
          today_earnings?: number
          total_consultations?: number
          this_month_consultations?: number
          average_rating?: number
          total_reviews?: number
          response_time_minutes?: number
          completion_rate?: number
          repeat_client_rate?: number
        }
        Update: {
          total_earnings?: number
          this_month_earnings?: number
          this_week_earnings?: number
          today_earnings?: number
          total_consultations?: number
          this_month_consultations?: number
          average_rating?: number
          total_reviews?: number
          response_time_minutes?: number
          completion_rate?: number
          repeat_client_rate?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_astrologer_availability: {
        Args: { astrologer_id: string }
        Returns: Json
      }
      get_user_stats: {
        Args: { user_id: string }
        Returns: Json
      }
      check_referral_code: {
        Args: { code: string }
        Returns: boolean
      }
      complete_consultation: {
        Args: { p_consultation_id: string; p_duration_minutes?: number }
        Returns: Json
      }
      set_astrologer_availability: {
        Args: { p_slots: Json }
        Returns: Json
      }
      request_astrologer_payout: {
        Args: Record<string, never>
        Returns: Json
      }
    }
    Enums: {
      subscription_tier: 'free' | 'basic' | 'premium' | 'gold'
      consultation_type: 'chat' | 'call' | 'video'
      consultation_status: 'pending' | 'accepted' | 'active' | 'completed' | 'cancelled' | 'declined'
      payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
      transaction_type: 'credit' | 'debit'
      transaction_source: 'topup' | 'refund' | 'referral' | 'consultation' | 'subscription'
      order_status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
      notification_type: 'consultation' | 'subscription' | 'wallet' | 'horoscope' | 'transit' | 'promo'
      language: 'en' | 'hi' | 'ta' | 'te' | 'kn'
    }
  }
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row']
export type Kundli = Database['public']['Tables']['kundlis']['Row']
export type Astrologer = Database['public']['Tables']['astrologers']['Row']

// UI-friendly Astrologer type with camelCase properties
export interface UiAstrologer {
  id: string;
  name: string;
  image: string | null;
  expertise: string;
  specialization: string[];
  languages: string[];
  experience: number;
  rating: number;
  reviews: number;
  consultations: number;
  pricePerMinute: number;
  verified: boolean;
  isOnline: boolean;
  isAvailable: boolean;
  isAi?: boolean;
  bio: string | null;
  availableFrom: string | null;
  availableTo: string | null;
  createdAt: string;
}

// Transform database Astrologer to UI Astrologer
export function transformAstrologer(dbAstrologer: Astrologer): UiAstrologer {
  return {
    id: dbAstrologer.id,
    name: dbAstrologer.name,
    image: dbAstrologer.avatar_url,
    expertise: dbAstrologer.expertise,
    specialization: dbAstrologer.specializations,
    languages: dbAstrologer.languages,
    experience: dbAstrologer.experience_years,
    rating: dbAstrologer.rating,
    reviews: dbAstrologer.total_reviews,
    consultations: dbAstrologer.total_consultations,
    pricePerMinute: dbAstrologer.price_per_minute,
    verified: dbAstrologer.is_verified,
    isOnline: dbAstrologer.is_online,
    isAvailable: dbAstrologer.is_available,
    isAi: dbAstrologer.is_ai ?? false,
    bio: dbAstrologer.bio,
    availableFrom: dbAstrologer.available_from,
    availableTo: dbAstrologer.available_to,
    createdAt: dbAstrologer.created_at,
  };
}
export type Consultation = Database['public']['Tables']['consultations']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type WalletTransaction = Database['public']['Tables']['wallet_transactions']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Referral = Database['public']['Tables']['referrals']['Row']
export type KundliMatch = Database['public']['Tables']['kundli_matches']['Row']
export type Horoscope = Database['public']['Tables']['horoscopes']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type AstrologerAvailability = Database['public']['Tables']['astrologer_availability']['Row']
export type AstrologerEarning = Database['public']['Tables']['astrologer_earnings']['Row']
export type AvailabilitySlot = Database['public']['Tables']['availability_slots']['Row']
export type AstrologerTimeOff = Database['public']['Tables']['astrologer_time_off']['Row']
export type AstrologerStats = Database['public']['Tables']['astrologer_stats']['Row']