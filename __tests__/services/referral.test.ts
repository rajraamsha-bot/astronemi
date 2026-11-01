import { getReferralStats } from '../../services/referral';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => {
  const defaultResponse = { data: [], error: null };
  const mockFrom = jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve(defaultResponse)),
      })),
    })),
  }));

  return {
    isSupabaseConfigured: jest.fn(() => true),
    supabase: {
      from: mockFrom,
    },
  };
});

describe('referral service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
  });

  it('should return empty stats if userId is empty', async () => {
    const stats = await getReferralStats('', 'MYCODE123');
    expect(stats.referralCode).toBe('MYCODE123');
    expect(stats.totalReferrals).toBe(0);
  });

  it('should return empty stats if Supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValueOnce(false);
    const stats = await getReferralStats('user123', 'MYCODE123');
    expect(stats.totalReferrals).toBe(0);
  });

  it('should fetch and aggregate referral data correctly', async () => {
    const mockData = [
      {
        id: 'ref1',
        referred_id: 'user_b',
        status: 'completed',
        reward_amount: 50,
        created_at: new Date().toISOString(),
        users: { name: 'John Doe' },
      },
      {
        id: 'ref2',
        referred_id: 'user_c',
        status: 'pending',
        reward_amount: null,
        created_at: new Date().toISOString(),
        users: [{ name: 'Jane Smith' }],
      },
    ];

    const mockOrder = jest.fn().mockResolvedValueOnce({ data: mockData, error: null });
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValueOnce({ select: mockSelect });

    const stats = await getReferralStats('user123', 'MYCODE123');

    expect(stats.referralCode).toBe('MYCODE123');
    expect(stats.totalReferrals).toBe(2);
    expect(stats.successfulReferrals).toBe(1);
    expect(stats.pendingReferrals).toBe(1);
    expect(stats.totalEarned).toBe(50);
    expect(stats.currentMonthEarned).toBe(50);
    expect(stats.referralHistory).toHaveLength(2);
    expect(stats.referralHistory[0].name).toBe('John Doe');
    expect(stats.referralHistory[1].name).toBe('Jane Smith');
  });

  it('should handle database errors gracefully', async () => {
    const mockOrder = jest.fn().mockResolvedValueOnce({ data: null, error: new Error('DB Error') });
    const mockEq = jest.fn(() => ({ order: mockOrder }));
    const mockSelect = jest.fn(() => ({ eq: mockEq }));
    (supabase.from as jest.Mock).mockReturnValueOnce({ select: mockSelect });

    const stats = await getReferralStats('user123', 'MYCODE123');
    expect(stats.totalReferrals).toBe(0);
  });
});
