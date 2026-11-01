/**
 * Consultation Service Tests
 * 
 * Tests for consultation API operations including:
 * - Creating consultations
 * - Fetching consultations
 * - Updating consultation status
 * - Submitting reviews
 * - Consultation filters and sorting
 */

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      // consultationsApi resolves the current user via getSession() (see
      // services/api.ts getCurrentUserId), not getUser(). Both are mocked so
      // the real code path is exercised.
      getSession: jest.fn(() =>
        Promise.resolve({
          data: { session: { user: { id: 'test-user-123' } } },
          error: null,
        })
      ),
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-123' } }, error: null })),
    },
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

import { consultationsApi } from '@/services/api';
import { supabase } from '@/lib/supabase';

describe('Consultation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all consultations for a user', async () => {
      const mockConsultations = [
        { id: 'c1', user_id: 'user-1', type: 'chat', status: 'completed' },
        { id: 'c2', user_id: 'user-1', type: 'video', status: 'active' },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockConsultations, error: null }),
      });

      const result = await consultationsApi.getAll('user-1');

      expect(result.data).toEqual(mockConsultations);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('consultations');
    });

    it('should return error when fetch fails', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Network error' } }),
      });

      const result = await consultationsApi.getAll('user-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('should order consultations by created_at descending', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await consultationsApi.getAll('user-1');

      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('getById', () => {
    it('should fetch a single consultation by ID', async () => {
      const mockConsultation = {
        id: 'c1',
        user_id: 'test-user-123',
        type: 'chat',
        status: 'active',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockConsultation, error: null }),
      });

      const result = await consultationsApi.getById('c1');

      expect(result.data).toEqual(mockConsultation);
      expect(supabase.from).toHaveBeenCalledWith('consultations');
    });

    it('should filter by consultation ID and user ID', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await consultationsApi.getById('c1');

      expect(mockChain.eq).toHaveBeenCalledWith('id', 'c1');
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'test-user-123');
    });

    it('should return error when consultation not found', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      });

      const result = await consultationsApi.getById('nonexistent');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('create', () => {
    it('should create a new consultation', async () => {
      const newConsultation = {
        astrologer_id: 'astro-1',
        type: 'chat',
        status: 'pending',
      };

      const createdConsultation = {
        id: 'c-new',
        user_id: 'test-user-123',
        ...newConsultation,
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: createdConsultation, error: null }),
      });

      const result = await consultationsApi.create(newConsultation);

      expect(result.data).toEqual(createdConsultation);
      expect(result.error).toBeNull();
    });

    it('should associate consultation with current user', async () => {
      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'c-new' }, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await consultationsApi.create({ astrologer_id: 'astro-1', type: 'chat' });

      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'test-user-123' })
      );
    });

    it('should create chat consultation', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { type: 'chat' }, error: null }),
      });

      const result = await consultationsApi.create({
        astrologer_id: 'astro-1',
        type: 'chat',
      });

      expect(result.data?.type).toBe('chat');
    });

    it('should create video consultation', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { type: 'video' }, error: null }),
      });

      const result = await consultationsApi.create({
        astrologer_id: 'astro-1',
        type: 'video',
      });

      expect(result.data?.type).toBe('video');
    });

    it('should create call consultation', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { type: 'call' }, error: null }),
      });

      const result = await consultationsApi.create({
        astrologer_id: 'astro-1',
        type: 'call',
      });

      expect(result.data?.type).toBe('call');
    });

    it('should return error when creation fails', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Creation failed' } }),
      });

      const result = await consultationsApi.create({ astrologer_id: 'astro-1', type: 'chat' });

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('updateStatus', () => {
    it('should update consultation status to active', async () => {
      const updatedConsultation = {
        id: 'c1',
        status: 'active',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedConsultation, error: null }),
      });

      const result = await consultationsApi.updateStatus('c1', 'active');

      expect(result.data).toEqual(updatedConsultation);
    });

    it('should update consultation status to completed', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { status: 'completed' }, error: null }),
      });

      const result = await consultationsApi.updateStatus('c1', 'completed');

      expect(result.data?.status).toBe('completed');
    });

    it('should update consultation status to cancelled', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { status: 'cancelled' }, error: null }),
      });

      const result = await consultationsApi.updateStatus('c1', 'cancelled');

      expect(result.data?.status).toBe('cancelled');
    });

    it('should filter by consultation ID and user ID when updating', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await consultationsApi.updateStatus('c1', 'active');

      expect(mockChain.eq).toHaveBeenCalledWith('id', 'c1');
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'test-user-123');
    });

    it('should return error when update fails', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
      });

      const result = await consultationsApi.updateStatus('c1', 'active');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('submitReview', () => {
    it('should submit a review for a consultation', async () => {
      const mockReview = {
        id: 'r1',
        consultation_id: 'c1',
        astrologer_id: 'astro-1',
        rating: 5,
        comment: 'Great session!',
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { user_id: 'test-user-123', astrologer_id: 'astro-1' },
            error: null,
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockReview, error: null }),
        });

      const result = await consultationsApi.submitReview('c1', { rating: 5, comment: 'Great session!' });

      expect(result.data).toEqual(mockReview);
    });

    it('should validate user owns the consultation before submitting review', async () => {
      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { user_id: 'other-user' }, error: null }),
        });

      const result = await consultationsApi.submitReview('c1', { rating: 5, comment: 'Test' });

      expect(result.error).toBeTruthy();
    });

    it('should return error when consultation not found for review', async () => {
      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        });

      const result = await consultationsApi.submitReview('nonexistent', { rating: 5, comment: 'Test' });

      expect(result.error).toBeTruthy();
    });
  });

  describe('Consultation Types', () => {
    it('should support chat consultation type', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { type: 'chat' }, error: null }),
      });

      const result = await consultationsApi.create({
        astrologer_id: 'astro-1',
        type: 'chat',
      });

      expect(result.data?.type).toBe('chat');
    });

    it('should support call consultation type', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { type: 'call' }, error: null }),
      });

      const result = await consultationsApi.create({
        astrologer_id: 'astro-1',
        type: 'call',
      });

      expect(result.data?.type).toBe('call');
    });

    it('should support video consultation type', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { type: 'video' }, error: null }),
      });

      const result = await consultationsApi.create({
        astrologer_id: 'astro-1',
        type: 'video',
      });

      expect(result.data?.type).toBe('video');
    });
  });

  describe('Consultation Status Flow', () => {
    it('should create consultation with pending status', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { status: 'pending' }, error: null }),
      });

      const result = await consultationsApi.create({
        astrologer_id: 'astro-1',
        type: 'chat',
        status: 'pending',
      });

      expect(result.data?.status).toBe('pending');
    });

    it('should transition from pending to active', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { status: 'active' }, error: null }),
      });

      const result = await consultationsApi.updateStatus('c1', 'active');

      expect(result.data?.status).toBe('active');
    });

    it('should transition from active to completed', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { status: 'completed' }, error: null }),
      });

      const result = await consultationsApi.updateStatus('c1', 'completed');

      expect(result.data?.status).toBe('completed');
    });

    it('should allow cancellation from any status', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { status: 'cancelled' }, error: null }),
      });

      const result = await consultationsApi.updateStatus('c1', 'cancelled');

      expect(result.data?.status).toBe('cancelled');
    });
  });
});
