/**
 * API Service Tests
 * 
 * Tests for centralized API service including:
 * - Generic request handler
 * - User API
 * - Astrologer API
 * - Consultation API
 * - Error handling
 */

import { apiRequest, ApiResponse, PaginatedResponse } from '@/services/api';

// Mock crash-reporting
jest.mock('@/services/crash-reporting', () => ({
  crashReporting: {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
  },
}));

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        range: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
    },
  },
}));

describe('API Service', () => {
  describe('apiRequest', () => {
it('should return success response when request succeeds', async () => {
       const mockData = { id: '1', name: 'Test User' };
       const request = jest.fn(() => Promise.resolve({ data: mockData, error: null } as const));
       
       const result = await apiRequest(request);
       
       expect(result.data).toEqual(mockData);
       expect(result.error).toBeNull();
       expect(result.status).toBe(200);
     });

it('should return error response when request fails', async () => {
       const mockError = { message: 'Database error' };
       const request = jest.fn(() => Promise.resolve({ data: null, error: mockError } as const));
       
       const result = await apiRequest(request);
       
       expect(result.data).toBeNull();
       expect(result.error).toBe('Database error');
       expect(result.status).toBe(500);
     });

    it('should handle network errors', async () => {
      const request = jest.fn(() => Promise.reject(new Error('Network failure')));
      
      const result = await apiRequest(request);
      
      expect(result.data).toBeNull();
      expect(result.error).toBe('Network failure');
      expect(result.status).toBe(500);
    });

it('should handle errors without message', async () => {
       const request = jest.fn(() => Promise.resolve({ data: null, error: {} } as const));
       
       const result = await apiRequest(request);
       
       expect(result.data).toBeNull();
       expect(result.error).toBe('An error occurred');
     });

    it('should handle unknown error types', async () => {
      const request = jest.fn(() => Promise.reject('Unknown error'));
      
      const result = await apiRequest(request);
      
      expect(result.data).toBeNull();
      expect(result.error).toBe('Network error');
    });
  });

  describe('ApiResponse Type', () => {
    it('should define success response structure', () => {
      const response: ApiResponse<{ id: string }> = {
        data: { id: '123' },
        error: null,
        status: 200,
      };
      
      expect(response.data).toEqual({ id: '123' });
      expect(response.error).toBeNull();
      expect(response.status).toBe(200);
    });

    it('should define error response structure', () => {
      const response: ApiResponse<null> = {
        data: null,
        error: 'Not found',
        status: 404,
      };
      
      expect(response.data).toBeNull();
      expect(response.error).toBe('Not found');
      expect(response.status).toBe(404);
    });
  });

  describe('PaginatedResponse Type', () => {
    it('should define paginated response structure', () => {
      const response: PaginatedResponse<{ id: string; name: string }> = {
        data: [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
        ],
        total: 100,
        page: 1,
        pageSize: 10,
        hasMore: true,
      };
      
      expect(response.data).toHaveLength(2);
      expect(response.total).toBe(100);
      expect(response.page).toBe(1);
      expect(response.pageSize).toBe(10);
      expect(response.hasMore).toBe(true);
    });

    it('should handle empty paginated response', () => {
      const response: PaginatedResponse<unknown> = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        hasMore: false,
      };
      
      expect(response.data).toHaveLength(0);
      expect(response.hasMore).toBe(false);
    });
  });

  describe('Request Validation', () => {
    it('should handle null data response', async () => {
      const request = jest.fn(() => Promise.resolve({ data: null, error: null }));
      
      const result = await apiRequest(request);
      
      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should handle undefined error message', async () => {
      const request = jest.fn(() => Promise.resolve({ data: null, error: { message: undefined } }));
      
      const result = await apiRequest(request);
      
      expect(result.error).toBe('An error occurred');
    });
  });
});
