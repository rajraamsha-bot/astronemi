/**
 * ProtectedAdminRoute Component Tests
 *
 * Tests for admin route protection with server-side is_admin check.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { UserRole } from '@/utils/rbac';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/contexts/UserContext', () => ({
  useUser: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

jest.mock('@/utils/rbac', () => {
  const actualRbac = jest.requireActual('@/utils/rbac');
  return {
    ...actualRbac,
    logAdminAction: jest.fn(),
  };
});

const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { logAdminAction } from '@/utils/rbac';
import { supabase } from '@/lib/supabase';
import ProtectedAdminRoute from '@/components/admin/ProtectedAdminRoute';

describe('ProtectedAdminRoute Component', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  const mockLogAdminAction = logAdminAction as jest.MockedFunction<typeof logAdminAction>;

  const TestChild = () => <Text>Admin Content</Text>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Access Control', () => {
    it('should render children when user has admin access', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'admin@test.com' } as any,
        isAuthenticated: true,
      } as any);

      mockRpc.mockResolvedValue({
        data: true,
        error: null,
      });

      const { getByText } = render(
        <ProtectedAdminRoute>
          <TestChild />
        </ProtectedAdminRoute>
      );

      await waitFor(() => {
        expect(getByText('Admin Content')).toBeTruthy();
      });
    });

    it('should deny access for non-admin users', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'user@test.com' } as any,
        isAuthenticated: true,
      } as any);

      mockRpc.mockResolvedValue({
        data: false,
        error: null,
      });

      const { getByText } = render(
        <ProtectedAdminRoute>
          <TestChild />
        </ProtectedAdminRoute>
      );

      await waitFor(() => {
        expect(getByText('Access Denied')).toBeTruthy();
      });
    });

    it('should deny access for unauthenticated users', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      } as any);

      const { getByText } = render(
        <ProtectedAdminRoute>
          <TestChild />
        </ProtectedAdminRoute>
      );

      await waitFor(() => {
        expect(getByText('Verifying admin access...')).toBeTruthy();
      });
    });
  });

  describe('Redirect Behavior', () => {
    it('should redirect to login when unauthenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      } as any);

      render(
        <ProtectedAdminRoute>
          <TestChild />
        </ProtectedAdminRoute>
      );

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith('/login');
      });
    });

    it('should redirect when not authorized', async () => {
      jest.useFakeTimers();
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'user@test.com' } as any,
        isAuthenticated: true,
      } as any);

      mockRpc.mockResolvedValue({
        data: false,
        error: null,
      });

      const { getByText } = render(
        <ProtectedAdminRoute>
          <TestChild />
        </ProtectedAdminRoute>
      );

      await waitFor(() => {
        expect(getByText('Access Denied')).toBeTruthy();
      });

      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith('/');
      });

      jest.useRealTimers();
    });
  });

  describe('Audit Logging', () => {
    it('should log admin action on access', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'admin@test.com' } as any,
        isAuthenticated: true,
      } as any);

      mockRpc.mockResolvedValue({
        data: true,
        error: null,
      });

      render(
        <ProtectedAdminRoute>
          <TestChild />
        </ProtectedAdminRoute>
      );

      await waitFor(() => {
        expect(mockLogAdminAction).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple children', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'admin@test.com' } as any,
        isAuthenticated: true,
      } as any);

      mockRpc.mockResolvedValue({
        data: true,
        error: null,
      });

      const { getByText } = render(
        <ProtectedAdminRoute>
          <Text>Child 1</Text>
          <Text>Child 2</Text>
        </ProtectedAdminRoute>
      );

      await waitFor(() => {
        expect(getByText('Child 1')).toBeTruthy();
        expect(getByText('Child 2')).toBeTruthy();
      });
    });

    it('should show loading when user is null', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      } as any);

      const { getByText } = render(
        <ProtectedAdminRoute>
          <TestChild />
        </ProtectedAdminRoute>
      );

      await waitFor(() => {
        expect(getByText('Verifying admin access...')).toBeTruthy();
      });
    });
  });
});
