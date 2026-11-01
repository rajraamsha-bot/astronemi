import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { getUserStorageKey } from '@/utils/user-storage-keys';

/**
 * Focused tests for the server-backed reviews sync (public.reviews).
 * Isolated supabase mock: the query builder records inserts and resolves
 * per-table so the reviews loader and referral-stats loader don't interfere.
 */

let mockStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((key: string, value: string) => {
    mockStore[key] = String(value);
    return Promise.resolve();
  }),
  getItem: jest.fn((key: string) => Promise.resolve(mockStore[key] || null)),
  removeItem: jest.fn((key: string) => {
    delete mockStore[key];
    return Promise.resolve();
  }),
}));

const mockAuthUser = {
  id: 'auth-user-123',
  phone: '9876543210',
  name: 'Test User',
  email: 'test@example.com',
  walletBalance: 100,
  subscriptionTier: 'free' as const,
  referralCode: 'TEST1234',
  language: 'en' as const,
  notificationsEnabled: true,
  createdAt: Date.now(),
};

type RespondFn = (table: string) => Promise<{ data: unknown; error: unknown }>;
const mockSupabaseState: {
  configured: boolean;
  respondFor: RespondFn;
  inserts: Array<Record<string, unknown>>;
} = {
  configured: true,
  respondFor: () => Promise.resolve({ data: [], error: null }),
  inserts: [],
};

jest.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: jest.fn(() => mockSupabaseState.configured),
  supabase: {
    auth: {
      getUser: jest.fn(async () => ({ data: { user: { id: 'auth-user-123' } }, error: null })),
    },
    rpc: jest.fn(async () => ({ data: null, error: null })),
    from: jest.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'order', 'limit', 'range', 'upsert', 'single']) {
        chain[method] = jest.fn(() => chain);
      }
      chain.insert = jest.fn((payload: Record<string, unknown>) => {
        mockSupabaseState.inserts.push(payload);
        return chain;
      });
      chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        mockSupabaseState.respondFor(table).then(resolve, reject);
      return chain;
    }),
  },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: mockAuthUser,
    isAuthenticated: true,
    logout: jest.fn(),
  })),
}));

jest.mock('@/utils/crypto', () => ({
  generateUUID: jest.fn(() => 'local-uuid-1'),
  generateReferralCode: jest.fn(() => 'TEST1234'),
}));
jest.mock('@/utils/notifications', () => ({
  initializeNotifications: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/services/logger', () => ({
  Logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

const reviewRow = {
  id: 'rev-1',
  astrologer_id: 'ast-1',
  user_id: 'auth-user-123',
  rating: 5,
  comment: 'Great session',
  created_at: new Date('2026-01-05T10:00:00Z').toISOString(),
};

describe('UserContext reviews sync', () => {
  beforeEach(() => {
    mockStore = {};
    mockSupabaseState.inserts = [];
    mockSupabaseState.configured = true;
    mockSupabaseState.respondFor = (table: string) =>
      table === 'reviews'
        ? Promise.resolve({ data: [reviewRow], error: null })
        : Promise.resolve({ data: [], error: null });
  });

  it('loads own reviews from the server on login and caches them', async () => {
    const { result } = renderHook(() => useUser(), { wrapper: UserProvider });
    await act(async () => {});

    expect(result.current.userReviews).toHaveLength(1);
    expect(result.current.userReviews[0]).toMatchObject({
      id: 'rev-1',
      astrologerId: 'ast-1',
      rating: 5,
      comment: 'Great session',
      helpful: 0,
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      getUserStorageKey('userReviews', 'auth-user-123'),
      expect.stringContaining('"id":"rev-1"')
    );
  });

  it('addReview writes through to public.reviews and prepends the saved row', async () => {
    const { result } = renderHook(() => useUser(), { wrapper: UserProvider });
    await act(async () => {});
    mockSupabaseState.inserts = [];

    const savedRow = { ...reviewRow, id: 'rev-2' };
    mockSupabaseState.respondFor = (table: string) =>
      table === 'reviews' && mockSupabaseState.inserts.length > 0
        ? Promise.resolve({ data: savedRow, error: null })
        : Promise.resolve({ data: [], error: null });

    await act(async () => {
      await result.current.addReview({
        astrologerId: 'ast-1',
        userName: 'Test User',
        rating: 5,
        comment: 'Great session',
        consultationType: 'chat',
        consultationId: 'consultation-9',
      });
    });

    expect(mockSupabaseState.inserts[0]).toMatchObject({
      consultation_id: 'consultation-9',
      user_id: 'auth-user-123',
      astrologer_id: 'ast-1',
      rating: 5,
    });
    expect(result.current.userReviews[0].id).toBe('rev-2');
  });

  it('surfaces policy rejections instead of pretending success', async () => {
    const { result } = renderHook(() => useUser(), { wrapper: UserProvider });
    await act(async () => {});
    mockSupabaseState.inserts = [];
    mockSupabaseState.respondFor = () =>
      Promise.resolve({
        data: null,
        error: new Error('new row violates row-level security policy'),
      });

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.addReview({
          astrologerId: 'ast-1',
          userName: 'Test User',
          rating: 1,
          comment: 'not my consultation',
          consultationType: 'chat',
          consultationId: 'someone-elses',
        });
      } catch (e) {
        caught = e as Error;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error | null)?.message).toContain('row-level security');
  });

  it('falls back to a local record when Supabase is unconfigured', async () => {
    mockSupabaseState.configured = false;
    const { result } = renderHook(() => useUser(), { wrapper: UserProvider });
    await act(async () => {});

    await act(async () => {
      await result.current.addReview({
        astrologerId: 'ast-1',
        userName: 'Test User',
        rating: 4,
        comment: 'offline note',
        consultationType: 'call',
        consultationId: 'consultation-8',
      });
    });

    expect(mockSupabaseState.inserts).toHaveLength(0);
    const local = result.current.userReviews.find(r => r.comment === 'offline note');
    expect(local?.id).toBe('local-uuid-1');
  });
});
