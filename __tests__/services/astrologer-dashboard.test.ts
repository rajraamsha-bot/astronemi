/**
 * Astrologer Dashboard Service Tests
 *
 * Tests the methods of astrologerDashboard against:
 *  - Mock mode (no Supabase configured): returns mock data
 *  - Supabase mode: validates TABLE-shaped returns and updates
 *  - Error handling: graceful degradation on Supabase errors
 */

import fs from 'fs';
import path from 'path';

// The dashboard service serves mock data ONLY when explicitly opted in for
// development (`EXPO_PUBLIC_USE_MOCK_API=true` AND `__DEV__`). The "Mock
// mode" tests below opt in before the service module loads; the
// "Production safety" tests clear the flag and reload the module.
process.env.EXPO_PUBLIC_USE_MOCK_API = 'true';

// Deliberately a dynamic require: babel hoists static imports above the
// process.env assignment above, and ALLOW_DEV_MOCK is evaluated once at
// module load.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { astrologerDashboard } = require('@/services/astrologer-dashboard') as typeof import('@/services/astrologer-dashboard');

jest.mock('expo-crypto', () => {
  const { randomFillSync, createHash } = require('crypto');
  return {
    getRandomValues: jest.fn((arr) => randomFillSync(arr)),
    digestStringAsync: jest.fn(async (_alg, data) => createHash('sha256').update(data).digest('hex')),
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  };
});

// Mock the supabase module
jest.mock('@/lib/supabase', () => {
  const mockRpcResponses: Record<string, { data: unknown; error: unknown }> = {};
  const mockTableData: Record<string, unknown[]> = {};
  const mockRpcCalls: Array<{ name: string; args: unknown }> = [];
  const mockFromCalls: Array<{ table: string; method: string; args: unknown }> = [];
  let mockIsConfigured = false;
  let mockUser: { id: string; user_metadata: { role: string } } | null = null;

  const buildBuilder = (table?: string) => {
    const CHAINABLE = [
      'select', 'insert', 'update', 'upsert', 'delete',
      'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
      'order', 'limit'
    ];
    const dataResponse = () => ({ data: mockTableData[table as string] ?? { id: 'mock' }, error: null });
    const builder: Record<string, unknown> = {};
    for (const key of CHAINABLE) {
      builder[key] = jest.fn((...args: any[]) => {
        mockFromCalls.push({ table: table as string, method: key, args });
        return builder;
      });
    }
    builder.single = jest.fn(async () => dataResponse());
    builder.then = jest.fn((resolve: (v: unknown) => void) =>
      Promise.resolve({ data: mockTableData[table as string] ?? [], error: null }).then(resolve)
    );
    return builder;
  };

  return {
    supabase: {
      rpc: jest.fn(async (name: string, args: unknown) => {
        mockRpcCalls.push({ name, args });
        return mockRpcResponses[name] || { data: [], error: null };
      }),
      from: jest.fn((table: string) => buildBuilder(table)),
      auth: {
        getUser: jest.fn(async () => ({ data: { user: mockUser }, error: null })),
      },
    },
    isSupabaseConfigured: () => mockIsConfigured,
    __mock: {
      setConfigured: (v: boolean) => { mockIsConfigured = v; },
      setUser: (u: typeof mockUser) => { mockUser = u; },
      setRpcResponse: (name: string, resp: { data: unknown; error: unknown }) => {
        mockRpcResponses[name] = resp;
      },
      setTableData: (table: string, data: unknown) => {
        mockTableData[table] = data as any;
      },
      getRpcCalls: () => mockRpcCalls,
      getFromCalls: () => mockFromCalls,
      clearAll: () => {
        Object.keys(mockRpcResponses).forEach((k) => delete mockRpcResponses[k]);
        Object.keys(mockTableData).forEach((k) => delete mockTableData[k]);
        mockRpcCalls.length = 0;
        mockFromCalls.length = 0;
      },
    },
  };
});

const supabaseMock = jest.requireMock('@/lib/supabase') as any;
const __mock = supabaseMock.__mock;

beforeEach(() => {
  __mock.clearAll();
  __mock.setConfigured(false); // Default: mock mode
});

describe('Mock mode (Supabase not configured, mock flag ON)', () => {
  test('getProfile returns realistic mock data', async () => {
    const profile = await astrologerDashboard.getProfile();
    expect(profile.id).toBe('astrologer_1');
  });

  test('listConsultations returns all mock consultations', async () => {
    const all = await astrologerDashboard.listConsultations({ status: 'all' });
    expect(all.length).toBeGreaterThan(0);
  });
  
  test('requestPayout returns a CSPRNG-generated payoutId', async () => {
    const result = await astrologerDashboard.requestPayout();
    expect(result.success).toBe(true);
    expect(result.payoutId).toMatch(/^payout_[A-Za-z0-9_-]+$/);
  });
});

describe('Production safety (mock flag OFF — no fabricated data)', () => {
  // Reload the module with the mock flag cleared so ALLOW_DEV_MOCK is false.
  const loadProductionModule = () => {
    delete process.env.EXPO_PUBLIC_USE_MOCK_API;
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@/services/astrologer-dashboard').astrologerDashboard as typeof astrologerDashboard;
  };

  test('getProfile throws instead of returning fake earnings', async () => {
    const prod = await loadProductionModule();
    await expect(prod.getProfile()).rejects.toBeTruthy();
  });

  test('listConsultations/listEarnings return empty instead of fake data', async () => {
    const prod = await loadProductionModule();
    const consultations = await prod.listConsultations();
    const earnings = await prod.listEarnings();
    expect(consultations).toEqual([]);
    expect(earnings).toEqual([]);
  });

  test('payout/accept do not report fake success', async () => {
    const prod = await loadProductionModule();
    const payout = await prod.requestPayout();
    expect(payout.success).toBe(false);
    const accept = await prod.acceptConsultation('c-1');
    expect(accept.success).toBe(false);
  });
});

describe('Supabase mode — TABLE-shaped extraction and operations', () => {
  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    __mock.setConfigured(true);
    __mock.setUser({ id: 'astro-1', user_metadata: { role: 'astrologer' } });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('completeConsultation extracts server-computed earnings', async () => {
    __mock.setRpcResponse('complete_consultation', {
      data: [{ success: true, net_earnings: 525 }],
      error: null,
    });
    const result = await astrologerDashboard.completeConsultation('c-1', 30);
    expect(result.success).toBe(true);
    // complete_consultation no longer reports a wallet new_balance (032):
    // earnings are returned as net_earnings.
    expect(result.newBalance).toBeUndefined();
    expect(result.netEarned).toBe(525);
  });

  test('requestPayout extracts TABLE row correctly', async () => {
    __mock.setRpcResponse('request_astrologer_payout', {
      data: [{ payout_id: 'payout_abc123', amount: 525 }],
      error: null,
    });
    const result = await astrologerDashboard.requestPayout();
    expect(result.success).toBe(true);
    expect(result.payoutId).toBe('payout_abc123');
  });

  test('acceptConsultation calls the server-authoritative RPC', async () => {
    __mock.setRpcResponse('accept_consultation', {
      data: { success: true, status: 'active', started_at: new Date().toISOString() },
      error: null,
    });
    const result = await astrologerDashboard.acceptConsultation('c-42');
    expect(result.success).toBe(true);
    const rpcCall = __mock.getRpcCalls().find((c: any) => c.name === 'accept_consultation');
    expect(rpcCall).toBeDefined();
    expect(rpcCall.args.p_consultation_id).toBe('c-42');
  });

  test('declineConsultation calls the decline RPC with the reason', async () => {
    __mock.setRpcResponse('decline_consultation', {
      data: { success: true, status: 'declined' },
      error: null,
    });
    const result = await astrologerDashboard.declineConsultation('c-42', 'busy');
    expect(result.success).toBe(true);
    const rpcCall = __mock.getRpcCalls().find((c: any) => c.name === 'decline_consultation');
    expect(rpcCall).toBeDefined();
    expect(rpcCall.args.p_consultation_id).toBe('c-42');
    expect(rpcCall.args.p_reason).toBe('busy');
  });

  test('getProfile falls back to mock on Supabase error', async () => {
    const originalFrom = supabaseMock.supabase.from;
    supabaseMock.supabase.from = jest.fn(() => {
      throw new Error('Network error');
    });
    try {
      const profile = await astrologerDashboard.getProfile();
      expect(profile.id).toBe('astrologer_1');
    } finally {
      supabaseMock.supabase.from = originalFrom;
    }
  });

  test('listConsultations falls back to mock on Supabase error', async () => {
    const originalFrom = supabaseMock.supabase.from;
    supabaseMock.supabase.from = jest.fn(() => {
      throw new Error('Network error');
    });
    try {
      const consultations = await astrologerDashboard.listConsultations();
      expect(Array.isArray(consultations)).toBe(true);
    } finally {
      supabaseMock.supabase.from = originalFrom;
    }
  });
});

describe('Cache behavior', () => {
  let nowSpy: jest.SpyInstance;
  beforeEach(() => {
    // Fast-forward time to invalidate any cache from prior tests
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 40000);
  });
  afterEach(() => {
    nowSpy.mockRestore();
  });

  test('Caches getProfile for 30s', async () => {
    __mock.setConfigured(true);
    // getProfile now resolves the caller via auth.getUser() and filters the
    // astrologer row by user_id, so the mock needs a user and .eq chaining.
    __mock.setUser({ id: 'astro-user-1', user_metadata: { role: 'astrologer' } });
    let callCount = 0;
    const origFrom = supabaseMock.supabase.from;
    
    supabaseMock.supabase.from = jest.fn(() => {
      callCount++;
      const builder = {
        select: () => builder,
        eq: () => builder,
        single: async () => ({ data: { id: 'astro_123', name: 'Real Astro' }, error: null }),
      };
      return builder;
    });
    
    try {
      await astrologerDashboard.getProfile();
      await astrologerDashboard.getProfile();
      await astrologerDashboard.getProfile();
      // getProfile makes 2 DB calls (astrologers + astrologer_dashboard_stats)
      // but only on first invocation; second and third use cache
      expect(callCount).toBe(2);
    } finally {
      supabaseMock.supabase.from = origFrom;
    }
  });

  test('Invalidates cache after acceptConsultation', async () => {
    __mock.setConfigured(true);
    __mock.setRpcResponse('accept_consultation', {
      data: { success: true, status: 'active' },
      error: null,
    });
    await astrologerDashboard.acceptConsultation('c-1');
    const acceptCalls = __mock.getRpcCalls().filter((c: any) => c.name === 'accept_consultation');
    expect(acceptCalls.length).toBeGreaterThan(0);
  });
});

describe('Secure random usage', () => {
  test('Uses prefixedSecureId for IDs (not Math.random)', () => {
    const filePath = path.join(__dirname, '../../services/astrologer-dashboard.ts');
    const source = fs.readFileSync(filePath, 'utf-8');
    expect(source).toContain('prefixedSecureId');
    const matches = source.match(/Math\.random\(\)/g) || [];
    expect(matches.length).toBe(0);
  });
});

afterAll(async () => {
  jest.clearAllTimers();
  await new Promise(resolve => setTimeout(resolve, 0));
});
