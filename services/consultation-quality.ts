/**
 * Consultation Quality Service
 *
 * Manages consultation lifecycle quality:
 * - Session recording metadata and consent
 * - Post-consultation ratings and reviews
 * - Dispute resolution workflow
 * - Quality metrics tracking
 */

import { supabase } from '@/lib/supabase';
import { Logger } from './logger';

export type ConsultationType = 'chat' | 'call' | 'video';

export type ConsultationStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface ConsultationRecord {
  id: string;
  userId: string;
  astrologerId: string;
  type: ConsultationType;
  status: ConsultationStatus;
  startTime: string;
  endTime?: string;
  duration: number; // seconds
  amount: number;
  recordingUrl?: string;
  recordingConsent: boolean;
  metadata: ConsultationMetadata;
}

export interface ConsultationMetadata {
  astrologerJoinedAt?: string;
  userJoinedAt?: string;
  endedBy?: 'user' | 'astrologer' | 'system';
  endReason?: 'completed' | 'low_balance' | 'technical_issue' | 'user_initiated' | 'astrologer_initiated';
  networkQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  messagesExchanged?: number;
}

export interface RatingReview {
  consultationId: string;
  userId: string;
  astrologerId: string;
  rating: number; // 1-5
  review?: string;
  tags?: string[];
  createdAt: string;
}

export interface Dispute {
  id: string;
  consultationId: string;
  userId: string;
  astrologerId: string;
  reason: DisputeReason;
  description: string;
  status: 'open' | 'under_review' | 'resolved' | 'rejected';
  resolution?: string;
  refundAmount?: number;
  createdAt: string;
  resolvedAt?: string;
}

export type DisputeReason =
  | 'astrologer_not_available'
  | 'poor_connection'
  | 'unsatisfactory_service'
  | 'wrong_predictions'
  | 'rude_behavior'
  | 'billed_incorrectly'
  | 'technical_issue'
  | 'other';

export interface QualityMetrics {
  totalConsultations: number;
  averageRating: number;
  /** Not yet computed from message-level data; `null` means "not measured". */
  responseTimeSeconds: number | null;
  completionRate: number;
  disputeRate: number;
  /** Not yet computed from user-level data; `null` means "not measured". */
  repeatCustomerRate: number | null;
}

// ─── Service Implementation ───────────────────────────────────────────────────

export const ConsultationQualityService = {
  /**
   * Start a consultation session with recording metadata.
   */
  async startConsultation(params: {
    userId: string;
    astrologerId: string;
    type: ConsultationType;
    recordingConsent: boolean;
  }): Promise<{ success: boolean; consultationId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .insert({
          user_id: params.userId,
          astrologer_id: params.astrologerId,
          type: params.type,
          status: 'in_progress',
          recording_consent: params.recordingConsent,
          metadata: {
            userJoinedAt: new Date().toISOString(),
          },
        })
        .select('id')
        .single();

      if (error) throw error;

      return { success: true, consultationId: data.id };
    } catch (err) {
      Logger.error('Failed to start consultation', err);
      return { success: false, error: 'Failed to start consultation' };
    }
  },

  /**
   * End a consultation session and calculate final metrics.
   */
  async endConsultation(
    consultationId: string,
    _endMetadata: Record<string, unknown> = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: consultation, error: fetchError } = await supabase
        .from('consultations')
        .select('start_time')
        .eq('id', consultationId)
        .single();

      if (fetchError || !consultation) {
        return { success: false, error: fetchError?.message || 'Consultation not found' };
      }

      const { data, error } = await supabase.rpc('end_consultation', {
        p_consultation_id: consultationId,
      });

      if (error) {
        Logger.error('end_consultation RPC failed', error);
        return { success: false, error: error.message };
      }

      const result = data as { success?: boolean; message?: string } | null;
      if (result && result.success === false) {
        return { success: false, error: result.message || 'Failed to end consultation' };
      }

      return { success: true };
    } catch (err) {
      Logger.error('Failed to end consultation', err);
      return { success: false, error: 'Failed to end consultation' };
    }
  },

  /**
   * Submit a rating and review for a completed consultation.
   */
  async submitRating(params: {
    consultationId: string;
    userId: string;
    astrologerId: string;
    rating: number;
    review?: string;
    tags?: string[];
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate rating
      if (params.rating < 1 || params.rating > 5) {
        return { success: false, error: 'Rating must be between 1 and 5' };
      }

      const { error } = await supabase.from('consultation_reviews').insert({
        consultation_id: params.consultationId,
        user_id: params.userId,
        astrologer_id: params.astrologerId,
        rating: params.rating,
        review: params.review,
        tags: params.tags ?? [],
      });

      if (error) throw error;

      // Update astrologer average rating
      await this.updateAstrologerRating(params.astrologerId);

      return { success: true };
    } catch (err) {
      Logger.error('Failed to submit rating', err);
      return { success: false, error: 'Failed to submit rating' };
    }
  },

  /**
   * File a dispute for a consultation.
   */
  async fileDispute(params: {
    consultationId: string;
    userId: string;
    astrologerId: string;
    reason: DisputeReason;
    description: string;
  }): Promise<{ success: boolean; disputeId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('consultation_disputes')
        .insert({
          consultation_id: params.consultationId,
          user_id: params.userId,
          astrologer_id: params.astrologerId,
          reason: params.reason,
          description: params.description,
          status: 'open',
        })
        .select('id')
        .single();

      if (error) throw error;

      // Update consultation status
      await supabase
        .from('consultations')
        .update({ status: 'disputed' })
        .eq('id', params.consultationId);

      // Log dispute for admin attention
      Logger.warn('Consultation dispute filed', {
        consultationId: params.consultationId,
        reason: params.reason,
      });

      return { success: true, disputeId: data.id };
    } catch (err) {
      Logger.error('Failed to file dispute', err);
      return { success: false, error: 'Failed to file dispute' };
    }
  },

  /**
   * Resolve a dispute (admin only).
   */
  async resolveDispute(
    disputeId: string,
    resolution: {
      status: 'resolved' | 'rejected';
      resolution: string;
      refundAmount?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('resolve_consultation_dispute', {
        p_dispute_id: disputeId,
        p_status: resolution.status,
        p_resolution: resolution.resolution,
        p_refund_amount: resolution.refundAmount ?? 0,
      });

      if (error) throw error;

      const result = data as { success?: boolean; message?: string } | null;
      if (result && result.success === false) {
        return { success: false, error: result.message || 'Failed to resolve dispute' };
      }

      return { success: true };
    } catch (err) {
      Logger.error('Failed to resolve dispute', err);
      return { success: false, error: 'Failed to resolve dispute' };
    }
  },

  /**
   * List disputes (admin RLS policy restricts to admin users).
   */
  async listDisputes(
    opts: { status?: Dispute['status']; limit?: number } = {}
  ): Promise<Dispute[]> {
    try {
      let query = supabase
        .from('consultation_disputes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(opts.limit ?? 100);

      if (opts.status) {
        query = query.eq('status', opts.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        consultationId: String(row.consultation_id),
        userId: String(row.user_id),
        astrologerId: String(row.astrologer_id),
        reason: row.reason as DisputeReason,
        description: String(row.description ?? ''),
        status: (row.status as Dispute['status']) ?? 'open',
        createdAt: String(row.created_at ?? new Date().toISOString()),
        resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
        resolution: row.resolution ? String(row.resolution) : undefined,
        refundAmount: row.refund_amount != null ? Number(row.refund_amount) : undefined,
      })) as Dispute[];
    } catch (err) {
      Logger.error('Failed to list disputes', err);
      return [];
    }
  },

  /**
   * Get quality metrics for an astrologer.
   * Note: `responseTimeSeconds` and `repeatCustomerRate` are not yet computed
   * from source data and are returned as `null` (not a misleading `0`) so
   * consumers can distinguish "not measured" from a real value.
   */
  async getAstrologerQualityMetrics(astrologerId: string): Promise<QualityMetrics | null> {
    try {
      // Fetch all consultations (status included) so completion rate is
      // computed as completed / total instead of the old incorrect
      // total/(total+disputes) formula.
      const { data: consultations, error: cError } = await supabase
        .from('consultations')
        .select('status')
        .eq('astrologer_id', astrologerId);
      if (cError) throw cError;

      // Average rating across all reviews.
      const { data: reviews, error: rError } = await supabase
        .from('consultation_reviews')
        .select('rating')
        .eq('astrologer_id', astrologerId);
      if (rError) throw rError;

      // Count-only query (head) avoids pulling every dispute row to compute
      // the same aggregate.
      const { count: disputeCount, error: dError } = await supabase
        .from('consultation_disputes')
        .select('id', { count: 'exact', head: true })
        .eq('astrologer_id', astrologerId);
      if (dError) throw dError;

      const rows = consultations ?? [];
      const total = rows.length;
      const completed = rows.filter(c => c.status === 'completed').length;
      const disputes = disputeCount ?? 0;

      const avgRating =
        reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      return {
        totalConsultations: total,
        averageRating: Math.round(avgRating * 10) / 10,
        responseTimeSeconds: null, // Not measured yet — see JSDoc above.
        completionRate: total > 0 ? completed / total : 0,
        disputeRate: total > 0 ? disputes / total : 0,
        repeatCustomerRate: null, // Not measured yet — see JSDoc above.
      };
    } catch (err) {
      Logger.error('Failed to get quality metrics', err);
      return null;
    }
  },

  /**
   * Update astrologer's average rating.
   */
  async updateAstrologerRating(astrologerId: string): Promise<void> {
    try {
      // Use the SECURITY DEFINER RPC: direct writes to astrologers.rating are
      // (a) frozen by the enforce_astrologer_integrity trigger for non-admins
      // and (b) previously targeted `review_count`, a column that does not
      // exist (the real one is total_reviews) — so the old update silently
      // failed. The RPC recomputes from real reviews server-side.
      const { error } = await supabase.rpc('update_astrologer_rating', {
        p_astrologer_id: astrologerId,
      });
      if (error) throw error;
    } catch (err) {
      Logger.error('Failed to update astrologer rating', err);
    }
  },

  /**
   * Get available review tags for quick selection.
   */
  getReviewTags(): string[] {
    return [
      'Accurate Predictions',
      'Helpful Remedies',
      'Patient Listener',
      'Detailed Analysis',
      'Quick Response',
      'Knowledgeable',
      'Friendly',
      'Value for Money',
      'Poor Connection',
      'Rushed Session',
      'Generic Advice',
    ];
  },

  /**
   * Get dispute reasons with descriptions.
   */
  getDisputeReasons(): { value: DisputeReason; label: string }[] {
    return [
      { value: 'astrologer_not_available', label: 'Astrologer was not available' },
      { value: 'poor_connection', label: 'Poor audio/video connection' },
      { value: 'unsatisfactory_service', label: 'Unsatisfactory service quality' },
      { value: 'wrong_predictions', label: 'Predictions were incorrect' },
      { value: 'rude_behavior', label: 'Rude or unprofessional behavior' },
      { value: 'billed_incorrectly', label: 'Billed incorrectly' },
      { value: 'technical_issue', label: 'Technical issue prevented consultation' },
      { value: 'other', label: 'Other reason' },
    ];
  },
};

export default ConsultationQualityService;
