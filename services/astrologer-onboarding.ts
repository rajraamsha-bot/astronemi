/**
 * Astrologer Onboarding Service
 *
 * Manages the complete astrologer onboarding pipeline:
 * - Profile creation and KYC document verification
 * - Skills assessment test
 * - Pricing tier configuration
 * - Payout method setup (bank/UPI)
 * - Approval workflow
 */

import { supabase } from '@/lib/supabase';
import { Logger } from './logger';

export type OnboardingStatus =
  | 'draft'
  | 'profile_complete'
  | 'kyc_pending'
  | 'kyc_verified'
  | 'test_pending'
  | 'test_passed'
  | 'test_failed'
  | 'pricing_pending'
  | 'payout_pending'
  | 'under_review'
  | 'approved'
  | 'rejected';

export type KycDocumentType = 'aadhaar' | 'pan' | 'passport' | 'driving_license';

export type PayoutMethod = 'bank_transfer' | 'upi';

export interface AstrologerProfile {
  fullName: string;
  displayName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bio: string;
  experience: number; // years
  specializations: string[];
  languages: string[];
  education: string;
  certifications: string[];
}

export interface KycDocument {
  type: KycDocumentType;
  number: string;
  frontImageUrl: string;
  backImageUrl?: string;
  selfieUrl?: string;
}

export interface PricingTier {
  chatRate: number; // per minute in INR
  callRate: number;
  videoRate: number;
}

export interface PayoutDetails {
  method: PayoutMethod;
  accountHolderName: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
}

export interface SkillsTestResult {
  totalQuestions: number;
  correctAnswers: number;
  score: number; // 0-100
  passed: boolean;
  categoryScores: Record<string, number>;
}

export interface OnboardingState {
  astrologerId: string;
  status: OnboardingStatus;
  profile: AstrologerProfile | null;
  kycDocuments: KycDocument[];
  kycVerified: boolean;
  testResult: SkillsTestResult | null;
  pricing: PricingTier | null;
  payoutDetails: PayoutDetails | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewerNotes: string | null;
}

// ─── Skills Test Questions ────────────────────────────────────────────────────

const SKILLS_TEST_QUESTIONS = [
  {
    id: 'q1',
    category: 'basic_astrology',
    question: 'What is the ruling planet of Mesha (Aries) Rashi?',
    options: ['Sun', 'Moon', 'Mars', 'Jupiter'],
    correctAnswer: 2, // Mars
  },
  {
    id: 'q2',
    category: 'basic_astrology',
    question: 'How many Nakshatras are there in Vedic astrology?',
    options: ['12', '27', '36', '108'],
    correctAnswer: 1, // 27
  },
  {
    id: 'q3',
    category: 'basic_astrology',
    question: 'Which planet is considered the karaka for marriage in a female chart?',
    options: ['Venus', 'Jupiter', 'Mars', 'Saturn'],
    correctAnswer: 1, // Jupiter
  },
  {
    id: 'q4',
    category: 'advanced',
    question: 'In Ashtakavarga, what is the maximum number of bindus a sign can receive from a planet?',
    options: ['5', '7', '8', '12'],
    correctAnswer: 2, // 8
  },
  {
    id: 'q5',
    category: 'advanced',
    question: 'What is the Vimshottari Dasha period of Saturn?',
    options: ['16 years', '18 years', '19 years', '20 years'],
    correctAnswer: 2, // 19 years
  },
  {
    id: 'q6',
    category: 'remedies',
    question: 'Which gemstone is recommended for strengthening Jupiter?',
    options: ['Ruby', 'Pearl', 'Yellow Sapphire', 'Emerald'],
    correctAnswer: 2, // Yellow Sapphire
  },
  {
    id: 'q7',
    category: 'remedies',
    question: 'Which day of the week is ruled by Saturn?',
    options: ['Sunday', 'Monday', 'Saturday', 'Tuesday'],
    correctAnswer: 2, // Saturday
  },
  {
    id: 'q8',
    category: 'panchang',
    question: 'How many degrees does each Nakshatra span?',
    options: ['12°', '13°20\'', '15°', '30°'],
    correctAnswer: 1, // 13°20'
  },
  {
    id: 'q9',
    category: 'panchang',
    question: 'What is the fifth Tithi called?',
    options: ['Pratipada', 'Panchami', 'Dashami', 'Chaturthi'],
    correctAnswer: 1, // Panchami
  },
  {
    id: 'q10',
    category: 'dosha',
    question: 'Mangal Dosha occurs when Mars is placed in which houses from Lagna?',
    options: ['1, 2, 4, 7, 8, 12', '1, 4, 7, 8, 12', '1, 2, 4, 7, 8', '1, 4, 7, 10'],
    correctAnswer: 0, // 1, 2, 4, 7, 8, 12
  },
];

const PASSING_SCORE = 70;

// ─── Service Implementation ───────────────────────────────────────────────────

export const AstrologerOnboardingService = {
  /**
   * Create a new astrologer onboarding record.
   */
  async createOnboarding(userId: string): Promise<{ success: boolean; onboardingId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('astrologer_onboarding')
        .insert({
          user_id: userId,
          status: 'draft',
        })
        .select('id')
        .single();

      if (error) throw error;

      return { success: true, onboardingId: data.id };
    } catch (err) {
      Logger.error('Failed to create astrologer onboarding', err);
      return { success: false, error: 'Failed to create onboarding record' };
    }
  },

  /**
   * Save astrologer profile information.
   */
  async saveProfile(
    onboardingId: string,
    profile: AstrologerProfile
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('astrologer_onboarding')
        .update({
          profile_data: profile,
          status: 'profile_complete',
          updated_at: new Date().toISOString(),
        })
        .eq('id', onboardingId);

      if (error) throw error;

      return { success: true };
    } catch (err) {
      Logger.error('Failed to save astrologer profile', err);
      return { success: false, error: 'Failed to save profile' };
    }
  },

  /**
   * Submit KYC documents.
   */
  async submitKyc(
    onboardingId: string,
    documents: KycDocument[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('astrologer_onboarding')
        .update({
          kyc_documents: documents,
          status: 'kyc_pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', onboardingId);

      if (error) throw error;

      return { success: true };
    } catch (err) {
      Logger.error('Failed to submit KYC', err);
      return { success: false, error: 'Failed to submit KYC documents' };
    }
  },

  /**
   * Get skills test questions (randomized subset).
   */
  getSkillsTestQuestions(count: number = 10): typeof SKILLS_TEST_QUESTIONS {
    // Shuffle and return subset
    const shuffled = [...SKILLS_TEST_QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  },

  /**
   * Submit skills test answers and calculate score.
   */
  async submitSkillsTest(
    onboardingId: string,
    answers: Record<string, number>
  ): Promise<{ success: boolean; result?: SkillsTestResult; error?: string }> {
    try {
      let correct = 0;
      const categoryScores: Record<string, { correct: number; total: number }> = {};

      for (const question of SKILLS_TEST_QUESTIONS) {
        const userAnswer = answers[question.id];
        const isCorrect = userAnswer === question.correctAnswer;

        if (isCorrect) correct++;

        const cat = categoryScores[question.category] ?? { correct: 0, total: 0 };
        cat.total++;
        if (isCorrect) cat.correct++;
        categoryScores[question.category] = cat;
      }

      const total = SKILLS_TEST_QUESTIONS.length;
      const score = Math.round((correct / total) * 100);
      const passed = score >= PASSING_SCORE;

      const normalizedCategoryScores: Record<string, number> = {};
      for (const [cat, val] of Object.entries(categoryScores)) {
        normalizedCategoryScores[cat] = Math.round((val.correct / val.total) * 100);
      }

      const result: SkillsTestResult = {
        totalQuestions: total,
        correctAnswers: correct,
        score,
        passed,
        categoryScores: normalizedCategoryScores,
      };

      if (onboardingId && onboardingId !== 'onboard-demo') {
        const { error } = await supabase
          .from('astrologer_onboarding')
          .update({
            test_result: result,
            status: passed ? 'test_passed' : 'test_failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', onboardingId);

        if (error) throw error;
      }

      return { success: true, result };
    } catch (err) {
      Logger.error('Failed to submit skills test', err);
      return { success: false, error: 'Failed to submit test' };
    }
  },

  /**
   * Set pricing tiers.
   */
  async setPricing(
    onboardingId: string,
    pricing: PricingTier
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('astrologer_onboarding')
        .update({
          pricing_tier: pricing,
          status: 'payout_pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', onboardingId);

      if (error) throw error;

      return { success: true };
    } catch (err) {
      Logger.error('Failed to set pricing', err);
      return { success: false, error: 'Failed to set pricing' };
    }
  },

  /**
   * Set payout details.
   */
  async setPayoutDetails(
    onboardingId: string,
    payout: PayoutDetails
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('astrologer_onboarding')
        .update({
          payout_details: payout,
          status: 'under_review',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', onboardingId);

      if (error) throw error;

      return { success: true };
    } catch (err) {
      Logger.error('Failed to set payout details', err);
      return { success: false, error: 'Failed to set payout details' };
    }
  },

  /**
   * Get onboarding state.
   */
  async getOnboardingState(userId: string): Promise<OnboardingState | null> {
    try {
      const { data, error } = await supabase
        .from('astrologer_onboarding')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) return null;

      return {
        astrologerId: data.id,
        status: data.status,
        profile: data.profile_data,
        kycDocuments: data.kyc_documents ?? [],
        kycVerified: data.kyc_verified ?? false,
        testResult: data.test_result,
        pricing: data.pricing_tier,
        payoutDetails: data.payout_details,
        submittedAt: data.submitted_at,
        reviewedAt: data.reviewed_at,
        reviewerNotes: data.reviewer_notes,
      };
    } catch (err) {
      Logger.error('Failed to get onboarding state', err);
      return null;
    }
  },

  /**
   * Retry failed skills test.
   */
  async retrySkillsTest(onboardingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('astrologer_onboarding')
        .update({
          status: 'test_pending',
          test_result: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', onboardingId);

      if (error) throw error;

      return { success: true };
    } catch (err) {
      Logger.error('Failed to retry skills test', err);
      return { success: false, error: 'Failed to retry test' };
    }
  },

  /**
   * Pricing tier recommendations based on experience.
   */
  getRecommendedPricing(experienceYears: number): PricingTier {
    if (experienceYears < 2) {
      return { chatRate: 10, callRate: 15, videoRate: 20 };
    } else if (experienceYears < 5) {
      return { chatRate: 20, callRate: 30, videoRate: 40 };
    } else if (experienceYears < 10) {
      return { chatRate: 40, callRate: 60, videoRate: 80 };
    } else {
      return { chatRate: 80, callRate: 120, videoRate: 150 };
    }
  },

  /**
   * Validate UPI ID format.
   */
  validateUpiId(upiId: string): boolean {
    return /^[a-zA-Z0-9._-]+@[a-zA-Z]{2,}$/.test(upiId);
  },

  /**
   * Validate IFSC code format.
   */
  validateIfscCode(ifsc: string): boolean {
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
  },

  /**
   * Submit the entire application in one server-authoritative call.
   * Calls a SECURITY DEFINER RPC so the client cannot write privileged columns.
   */
  async submitApplication(input: {
    name: string;
    experience: string;
    languages: string;
    panNumber: string;
    aadhaarNumber: string;
    accountNumber: string;
    ifsc: string;
    upiId: string;
    chatRate: string;
    callRate: string;
    videoRate: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (sessionError || !userId) {
        return { success: false, error: 'Not signed in' };
      }

      const chatRateNum = Number(input.chatRate);
      const callRateNum = Number(input.callRate);
      const videoRateNum = Number(input.videoRate);
      if (!Number.isFinite(chatRateNum) || !Number.isFinite(callRateNum) || !Number.isFinite(videoRateNum)) {
        return { success: false, error: 'Pricing must be numeric' };
      }

      const { data, error } = await supabase.rpc('submit_astrologer_application', {
        p_user_id: userId,
        p_name: input.name,
        p_experience: input.experience,
        p_languages: input.languages,
        p_pan_number: input.panNumber,
        p_aadhaar_number: input.aadhaarNumber,
        p_account_number: input.accountNumber,
        p_ifsc: input.ifsc,
        p_upi_id: input.upiId,
        p_chat_rate: chatRateNum,
        p_call_rate: callRateNum,
        p_video_rate: videoRateNum,
      });

      if (error) {
        Logger.error('submit_astrologer_application RPC failed', error);
        return { success: false, error: error.message };
      }

      const ok = (data as { success?: boolean } | null)?.success !== false;
      return ok
        ? { success: true }
        : { success: false, error: (data as { error?: string } | null)?.error || 'Submission rejected' };
    } catch (err) {
      Logger.error('submitApplication threw', err);
      return { success: false, error: 'Unexpected error submitting application' };
    }
  },
};

export default AstrologerOnboardingService;
