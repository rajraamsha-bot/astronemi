/**
 * Shared test utilities for mocking Supabase
 */

export interface MockSupabaseResponse {
  data?: unknown;
  error?: Error | null;
  /** Supabase `{ count: 'exact' }` responses surface the row count here. */
  count?: number;
}

export type MockFromResponse = MockSupabaseResponse | ((table: string) => MockSupabaseResponse);

export interface MockThenable {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  upsert: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  single: jest.Mock;
  limit: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
  gte: jest.Mock;
  lt: jest.Mock;
  then: (resolve: (value: unknown) => unknown) => void;
}

export function createMockThenable(res: MockSupabaseResponse): MockThenable {
  const thenable: MockThenable = {
    select: jest.fn(() => thenable),
    insert: jest.fn(() => thenable),
    update: jest.fn(() => thenable),
    upsert: jest.fn(() => thenable),
    delete: jest.fn(() => thenable),
    eq: jest.fn(() => thenable),
    single: jest.fn(() => Promise.resolve(res)),
    limit: jest.fn(() => Promise.resolve(res)),
    order: jest.fn(() => thenable),
    range: jest.fn(() => Promise.resolve(res)),
    gte: jest.fn(() => thenable),
    lt: jest.fn(() => thenable),
    then: (resolve: (value: unknown) => unknown) => resolve(res),
  };
  return thenable;
}
