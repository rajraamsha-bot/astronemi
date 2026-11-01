/**
 * Consultation Quality Service Tests
 */

import ConsultationQualityService from '@/services/consultation-quality';
import { supabase } from '@/lib/supabase';
import { MockFromResponse, createMockThenable } from '../utils/mockSupabase';

describe('Consultation Quality Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockFrom(response: MockFromResponse) {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      const res = typeof response === 'function' ? response(table) : response;
      return createMockThenable(res);
    });
  }

  describe('startConsultation', () => {
    it('should start consultation successfully', async () => {
      mockFrom({ data: { id: 'consult-123' }, error: null });

      const result = await ConsultationQualityService.startConsultation({
        userId: 'user-1',
        astrologerId: 'astro-1',
        type: 'chat',
        recordingConsent: true,
      });

      expect(result.success).toBe(true);
      expect(result.consultationId).toBe('consult-123');
    });

    it('should handle start failure', async () => {
      mockFrom({ data: null, error: new Error('DB error') });

      const result = await ConsultationQualityService.startConsultation({
        userId: 'user-1',
        astrologerId: 'astro-1',
        type: 'video',
        recordingConsent: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('endConsultation', () => {
    it('should end consultation and calculate duration', async () => {
      let callCount = 0;
      mockFrom(() => {
        callCount++;
        if (callCount === 1) {
          // First call: fetch start_time
          return { data: { start_time: new Date(Date.now() - 60000).toISOString() }, error: null };
        }
        // Second call: update
        return { data: null, error: null };
      });

      const result = await ConsultationQualityService.endConsultation('consult-123', {
        endedBy: 'user',
        endReason: 'completed',
      });

      expect(result.success).toBe(true);
    });

    it('should handle fetch error', async () => {
      mockFrom({ data: null, error: new Error('Not found') });

      const result = await ConsultationQualityService.endConsultation('consult-123', {
        endedBy: 'system',
        endReason: 'technical_issue',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('submitRating', () => {
    it('should submit valid rating', async () => {
      mockFrom({ data: null, error: null });

      const result = await ConsultationQualityService.submitRating({
        consultationId: 'consult-123',
        userId: 'user-1',
        astrologerId: 'astro-1',
        rating: 5,
        review: 'Great session!',
        tags: ['Accurate Predictions', 'Helpful Remedies'],
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid rating below 1', async () => {
      const result = await ConsultationQualityService.submitRating({
        consultationId: 'consult-123',
        userId: 'user-1',
        astrologerId: 'astro-1',
        rating: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('between 1 and 5');
    });

    it('should reject invalid rating above 5', async () => {
      const result = await ConsultationQualityService.submitRating({
        consultationId: 'consult-123',
        userId: 'user-1',
        astrologerId: 'astro-1',
        rating: 6,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('between 1 and 5');
    });

    it('should handle DB error', async () => {
      mockFrom({ data: null, error: new Error('DB error') });

      const result = await ConsultationQualityService.submitRating({
        consultationId: 'consult-123',
        userId: 'user-1',
        astrologerId: 'astro-1',
        rating: 4,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('fileDispute', () => {
    it('should file dispute successfully', async () => {
      mockFrom({ data: { id: 'dispute-123' }, error: null });

      const result = await ConsultationQualityService.fileDispute({
        consultationId: 'consult-123',
        userId: 'user-1',
        astrologerId: 'astro-1',
        reason: 'unsatisfactory_service',
        description: 'The astrologer was not helpful.',
      });

      expect(result.success).toBe(true);
      expect(result.disputeId).toBe('dispute-123');
    });

    it('should handle error', async () => {
      mockFrom({ data: null, error: new Error('DB error') });

      const result = await ConsultationQualityService.fileDispute({
        consultationId: 'consult-123',
        userId: 'user-1',
        astrologerId: 'astro-1',
        reason: 'other',
        description: 'Issue',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('resolveDispute', () => {
    it('should resolve dispute', async () => {
      mockFrom({ data: null, error: null });

      const result = await ConsultationQualityService.resolveDispute('dispute-123', {
        status: 'resolved',
        resolution: 'Refund issued to user.',
        refundAmount: 100,
      });

      expect(result.success).toBe(true);
    });

    it('should reject dispute without refund', async () => {
      mockFrom({ data: null, error: null });

      const result = await ConsultationQualityService.resolveDispute('dispute-123', {
        status: 'rejected',
        resolution: 'No evidence provided.',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getAstrologerQualityMetrics', () => {
    it('should calculate metrics correctly', async () => {
      let callCount = 0;
      mockFrom((table: string) => {
        callCount++;
        if (table === 'consultations') {
          return {
            data: [
              { id: 'c1', status: 'completed' },
              { id: 'c2', status: 'completed' },
              { id: 'c3', status: 'completed' },
              { id: 'c4', status: 'cancelled' },
            ],
            error: null,
          };
        }
        if (table === 'consultation_reviews') {
          return {
            data: [{ rating: 5 }, { rating: 4 }, { rating: 5 }],
            error: null,
          };
        }
        if (table === 'consultation_disputes') {
          return {
            data: [{ id: 'd1' }],
            count: 1,
            error: null,
          };
        }
        return { data: null, error: null };
      });

      const metrics = await ConsultationQualityService.getAstrologerQualityMetrics('astro-1');

      expect(metrics).not.toBeNull();
      expect(metrics?.totalConsultations).toBe(4);
      expect(metrics?.averageRating).toBeCloseTo(4.7, 0);
      expect(metrics?.disputeRate).toBeCloseTo(0.25, 1);
      expect(metrics?.completionRate).toBeCloseTo(0.75, 1);
    });

    it('should return null on error', async () => {
      mockFrom({ data: null, error: new Error('DB error') });

      const metrics = await ConsultationQualityService.getAstrologerQualityMetrics('astro-1');

      expect(metrics).toBeNull();
    });
  });

  describe('getReviewTags', () => {
    it('should return review tags', () => {
      const tags = ConsultationQualityService.getReviewTags();
      expect(tags.length).toBeGreaterThan(0);
      expect(tags).toContain('Accurate Predictions');
      expect(tags).toContain('Quick Response');
    });
  });

  describe('getDisputeReasons', () => {
    it('should return dispute reasons with labels', () => {
      const reasons = ConsultationQualityService.getDisputeReasons();
      expect(reasons.length).toBeGreaterThan(0);
      expect(reasons[0]).toHaveProperty('value');
      expect(reasons[0]).toHaveProperty('label');
    });
  });
});
