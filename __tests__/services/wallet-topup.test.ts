/**
 * Wallet top-up policy tests.
 *
 * Digital credits must be bought through Apple IAP / Google Play Billing. The
 * legacy Razorpay helper must fail closed, and the denominations query remains
 * server-priced for display/admin compatibility.
 */

jest.mock('@/lib/supabase', () => {
  const chain: Record<string, jest.Mock> = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
  };
  chain.select.mockImplementation(() => chain);
  chain.eq.mockImplementation(() => chain);
  chain.order.mockResolvedValue({ data: [], error: null });

  const from = jest.fn(() => chain);
  const invoke = jest.fn();

  return {
    __esModule: true,
    supabase: {
      auth: {
        getUser: jest.fn(() =>
          Promise.resolve({ data: { user: { id: 'user-1' } } })
        ),
      },
      functions: { invoke },
      from,
    },
    isSupabaseConfigured: jest.fn(() => true),
    __walletMock: { chain, from, invoke },
  };
});

import { getTopupDenominations, topUpWallet } from '@/services/payment';

const walletMock = (jest.requireMock('@/lib/supabase') as {
  __walletMock: {
    chain: Record<string, jest.Mock>;
    from: jest.Mock;
    invoke: jest.Mock;
  };
}).__walletMock;

describe('wallet top-up', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    walletMock.chain.order.mockResolvedValue({
      data: [
        { id: 'denom-100', amount_inr: 100, bonus_inr: 0, display_order: 1 },
        { id: 'denom-500', amount_inr: 500, bonus_inr: 25, display_order: 2 },
      ],
      error: null,
    });

    walletMock.invoke.mockImplementation((name: string) => {
      if (name === 'create-razorpay-order') {
        return Promise.resolve({ data: { id: 'order_test_1', amount: 10000 }, error: null });
      }
      if (name === 'verify-payment') {
        return Promise.resolve({ data: { success: true, order_record_id: 'ord-1' }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
  });

  it('loads server-priced denominations in display order', async () => {
    const rows = await getTopupDenominations();

    expect(rows).toEqual([
      { id: 'denom-100', amountInr: 100, bonusInr: 0, displayOrder: 1 },
      { id: 'denom-500', amountInr: 500, bonusInr: 25, displayOrder: 2 },
    ]);
    expect(walletMock.from).toHaveBeenCalledWith('topup_denominations');
    expect(walletMock.chain.order).toHaveBeenCalledWith('display_order', { ascending: true });
  });

  it('fails closed instead of starting a Razorpay top-up', async () => {
    const result = await topUpWallet('denom-100', 100);

    expect(result.success).toBe(false);
    expect(result.error).toContain('App Store or Google Play');
    expect(walletMock.invoke).not.toHaveBeenCalled();
  });

  it('refuses a top-up without a denomination', async () => {
    const result = await topUpWallet('', 100);

    expect(result.success).toBe(false);
    expect(result.error).toContain('top-up amount');
    expect(walletMock.invoke).not.toHaveBeenCalled();
  });

  it('refuses invalid amounts before hitting the gateway', async () => {
    const result = await topUpWallet('denom-100', 0);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid top-up amount');
    expect(walletMock.invoke).not.toHaveBeenCalled();
  });
});
