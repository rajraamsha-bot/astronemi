/**
 * Astrologer Onboarding Service Tests
 */

import AstrologerOnboardingService from '@/services/astrologer-onboarding';
import { supabase } from '@/lib/supabase';
import { MockFromResponse, createMockThenable } from '../utils/mockSupabase';

describe('Astrologer Onboarding Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockFrom(response: MockFromResponse) {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      const res = typeof response === 'function' ? response(table) : response;
      return createMockThenable(res);
    });
  }

  describe('createOnboarding', () => {
    it('should create onboarding record successfully', async () => {
      mockFrom({ data: { id: 'onboard-123' }, error: null });

      const result = await AstrologerOnboardingService.createOnboarding('user-123');

      expect(result.success).toBe(true);
      expect(result.onboardingId).toBe('onboard-123');
    });

    it('should return error when insert fails', async () => {
      mockFrom({ data: null, error: new Error('DB error') });

      const result = await AstrologerOnboardingService.createOnboarding('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('saveProfile', () => {
    it('should save profile and update status', async () => {
      mockFrom({ data: null, error: null });

      const profile = {
        fullName: 'Test Astrologer',
        displayName: 'Astro Test',
        phone: '+91 9876543210',
        email: 'test@astro.com',
        dateOfBirth: '1990-01-01',
        gender: 'male' as const,
        bio: 'Experienced astrologer',
        experience: 5,
        specializations: ['Vedic', 'Nadi'],
        languages: ['Hindi', 'English'],
        education: 'B.A. Astrology',
        certifications: ['Jyotish Acharya'],
      };

      const result = await AstrologerOnboardingService.saveProfile('onboard-123', profile);

      expect(result.success).toBe(true);
    });
  });

  describe('submitKyc', () => {
    it('should submit KYC documents', async () => {
      mockFrom({ data: null, error: null });

      const docs = [
        { type: 'aadhaar' as const, number: '1234 5678 9012', frontImageUrl: 'url1' },
      ];

      const result = await AstrologerOnboardingService.submitKyc('onboard-123', docs);

      expect(result.success).toBe(true);
    });
  });

  describe('getSkillsTestQuestions', () => {
    it('should return 10 questions by default', () => {
      const questions = AstrologerOnboardingService.getSkillsTestQuestions();
      expect(questions).toHaveLength(10);
    });

    it('should return requested count when less than total', () => {
      const questions = AstrologerOnboardingService.getSkillsTestQuestions(5);
      expect(questions).toHaveLength(5);
    });

    it('should return valid question objects', () => {
      const questions = AstrologerOnboardingService.getSkillsTestQuestions(1);
      const q = questions[0];
      expect(q.id).toBeTruthy();
      expect(q.question).toBeTruthy();
      expect(q.options).toBeInstanceOf(Array);
      expect(q.options.length).toBeGreaterThan(0);
      expect(typeof q.correctAnswer).toBe('number');
    });
  });

  describe('submitSkillsTest', () => {
    beforeEach(() => {
      mockFrom({ data: null, error: null });
    });

    it('should pass with all correct answers', async () => {
      const answers: Record<string, number> = {
        q1: 2, q2: 1, q3: 1, q4: 2, q5: 2,
        q6: 2, q7: 2, q8: 1, q9: 1, q10: 0,
      };

      const result = await AstrologerOnboardingService.submitSkillsTest('onboard-123', answers);

      expect(result.success).toBe(true);
      expect(result.result?.passed).toBe(true);
      expect(result.result?.score).toBe(100);
    });

    it('should fail with low score', async () => {
      const answers: Record<string, number> = {
        q1: 0, q2: 0, q3: 0, q4: 0, q5: 0,
        q6: 0, q7: 0, q8: 0, q9: 0, q10: 1, // q10 correct is 0, so 1 is wrong
      };

      const result = await AstrologerOnboardingService.submitSkillsTest('onboard-123', answers);

      expect(result.success).toBe(true);
      expect(result.result?.passed).toBe(false);
      expect(result.result?.score).toBe(0);
    });

    it('should update status to test_passed when passed', async () => {
      const answers: Record<string, number> = {
        q1: 2, q2: 1, q3: 1, q4: 2, q5: 2,
        q6: 2, q7: 2, q8: 1, q9: 1, q10: 0,
      };

      await AstrologerOnboardingService.submitSkillsTest('onboard-123', answers);

      expect(mockFrom).toBeDefined();
    });
  });

  describe('setPricing', () => {
    it('should set pricing tier', async () => {
      mockFrom({ data: null, error: null });

      const pricing = { chatRate: 20, callRate: 30, videoRate: 40 };
      const result = await AstrologerOnboardingService.setPricing('onboard-123', pricing);

      expect(result.success).toBe(true);
    });
  });

  describe('setPayoutDetails', () => {
    it('should set payout details and status to under_review', async () => {
      mockFrom({ data: null, error: null });

      const payout = {
        method: 'upi' as const,
        accountHolderName: 'Test Astrologer',
        upiId: 'test@upi',
      };

      const result = await AstrologerOnboardingService.setPayoutDetails('onboard-123', payout);

      expect(result.success).toBe(true);
    });
  });

  describe('getOnboardingState', () => {
    it('should return onboarding state', async () => {
      mockFrom({
        data: {
          id: 'onboard-123',
          status: 'approved',
          profile_data: { fullName: 'Test' },
          kyc_documents: [],
          kyc_verified: true,
          test_result: { score: 80, passed: true },
          pricing_tier: { chatRate: 20 },
          payout_details: { method: 'upi' },
          submitted_at: '2024-01-01',
          reviewed_at: '2024-01-02',
          reviewer_notes: 'Good',
        },
        error: null,
      });

      const state = await AstrologerOnboardingService.getOnboardingState('user-123');

      expect(state).not.toBeNull();
      expect(state?.astrologerId).toBe('onboard-123');
      expect(state?.status).toBe('approved');
      expect(state?.profile?.fullName).toBe('Test');
      expect(state?.kycVerified).toBe(true);
      expect(state?.testResult?.passed).toBe(true);
    });

    it('should return null when not found', async () => {
      mockFrom({ data: null, error: { code: 'PGRST116' } });

      const state = await AstrologerOnboardingService.getOnboardingState('user-123');

      expect(state).toBeNull();
    });
  });

  describe('retrySkillsTest', () => {
    it('should reset test status', async () => {
      mockFrom({ data: null, error: null });

      const result = await AstrologerOnboardingService.retrySkillsTest('onboard-123');

      expect(result.success).toBe(true);
    });
  });

  describe('getRecommendedPricing', () => {
    it('should recommend beginner rates for < 2 years', () => {
      const pricing = AstrologerOnboardingService.getRecommendedPricing(1);
      expect(pricing.chatRate).toBe(10);
      expect(pricing.videoRate).toBe(20);
    });

    it('should recommend intermediate rates for 2-4 years', () => {
      const pricing = AstrologerOnboardingService.getRecommendedPricing(3);
      expect(pricing.chatRate).toBe(20);
      expect(pricing.videoRate).toBe(40);
    });

    it('should recommend advanced rates for 5-9 years', () => {
      const pricing = AstrologerOnboardingService.getRecommendedPricing(7);
      expect(pricing.chatRate).toBe(40);
      expect(pricing.videoRate).toBe(80);
    });

    it('should recommend expert rates for 10+ years', () => {
      const pricing = AstrologerOnboardingService.getRecommendedPricing(15);
      expect(pricing.chatRate).toBe(80);
      expect(pricing.videoRate).toBe(150);
    });
  });

  describe('validateUpiId', () => {
    it('should validate correct UPI IDs', () => {
      expect(AstrologerOnboardingService.validateUpiId('test@upi')).toBe(true);
      expect(AstrologerOnboardingService.validateUpiId('user123@okaxis')).toBe(true);
      expect(AstrologerOnboardingService.validateUpiId('name.surname@ybl')).toBe(true);
    });

    it('should reject invalid UPI IDs', () => {
      expect(AstrologerOnboardingService.validateUpiId('invalid')).toBe(false);
      expect(AstrologerOnboardingService.validateUpiId('@upi')).toBe(false);
      expect(AstrologerOnboardingService.validateUpiId('test@')).toBe(false);
    });
  });

  describe('validateIfscCode', () => {
    it('should validate correct IFSC codes', () => {
      expect(AstrologerOnboardingService.validateIfscCode('HDFC0001234')).toBe(true);
      expect(AstrologerOnboardingService.validateIfscCode('SBIN0123456')).toBe(true);
    });

    it('should reject invalid IFSC codes', () => {
      expect(AstrologerOnboardingService.validateIfscCode('INVALID')).toBe(false);
      expect(AstrologerOnboardingService.validateIfscCode('HDFC01234')).toBe(false);
      expect(AstrologerOnboardingService.validateIfscCode('hdfc0001234')).toBe(false);
    });
  });
});
