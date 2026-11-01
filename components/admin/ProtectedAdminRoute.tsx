/**
 * Protected Admin Route Component
 * Ensures only authorized users can access admin features.
 *
 * SECURITY: Admin status is determined by querying the server-side
 * `is_admin` / `is_super_admin` columns on the `users` table — NOT
 * by the locally-cached subscription tier, which an attacker can forge.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Shield, AlertTriangle } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { logAdminAction, UserRole } from '@/utils/rbac';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({
  children,
  requiredRole = UserRole.ADMIN,
}) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const { user, isAuthenticated, isHydrating } = useAuth();
  const [serverAdminStatus, setServerAdminStatus] = useState<{
    checked: boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;
  }>({ checked: false, isAdmin: false, isSuperAdmin: false });

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isHydrating) return;
      if (!isAuthenticated || !user?.id || !isSupabaseConfigured()) {
        setServerAdminStatus({ checked: true, isAdmin: false, isSuperAdmin: false });
        return;
      }

      try {
        // Server-authoritative admin check via the is_admin() RPC
        // (migration 012, EXECUTE granted to authenticated). NEVER select
        // is_admin/is_super_admin columns directly: migration 052 revokes
        // them from `authenticated`, so a direct select raises 42501 and
        // locks real admins out (fail-closed).
        const { data, error } = await supabase.rpc('is_admin', {
          uid: user.id,
        });

        if (error) {
          setServerAdminStatus({ checked: true, isAdmin: false, isSuperAdmin: false });
          return;
        }

        const admin = data === true;
        setServerAdminStatus({
          checked: true,
          isAdmin: admin,
          // super_admin distinction is not exposed to clients; treat admin
          // as admin. Server RLS/policies enforce super_admin-only paths.
          isSuperAdmin: false,
        });
      } catch {
        setServerAdminStatus({ checked: true, isAdmin: false, isSuperAdmin: false });
      }
    };

    checkAdminStatus();
  }, [isHydrating, isAuthenticated, user?.id]);

  const hasAccess = serverAdminStatus.isAdmin || serverAdminStatus.isSuperAdmin;
  const userRole = serverAdminStatus.isSuperAdmin
    ? UserRole.SUPER_ADMIN
    : serverAdminStatus.isAdmin
      ? UserRole.ADMIN
      : UserRole.FREE;

  useEffect(() => {
    if (isHydrating || !serverAdminStatus.checked) return;

    if (user) {
      logAdminAction({
        userId: user.id,
        userName: user.name || user.email || 'Unknown',
        userRole,
        action: 'ACCESS_ADMIN_DASHBOARD',
        resource: 'admin_dashboard',
        success: hasAccess,
        details: { requiredRole, actualRole: userRole },
      });
    }

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!hasAccess) {
      setTimeout(() => { router.replace('/'); }, 3000);
    }
  }, [isHydrating, serverAdminStatus.checked, isAuthenticated, hasAccess, user, userRole, requiredRole]);

  // Loading state — wait for server-side admin check
  if (isHydrating || !user || !serverAdminStatus.checked) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Verifying admin access...</Text>
      </View>
    );
  }

  // Unauthorized state
  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <AlertTriangle size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorMessage}>
            You don&apos;t have permission to access the admin dashboard.
          </Text>
          <Text style={styles.errorSubtext}>
            Server-verified role: <Text style={styles.roleText}>{userRole}</Text>
          </Text>
          <Text style={styles.redirectText}>Redirecting to home...</Text>
        </View>
      </View>
    );
  }

  // Authorized - render children
  return (
    <>
      {/* Admin Badge */}
      <View style={styles.adminBadge}>
        <Shield size={14} color={Colors.white} />
        <Text style={styles.adminBadgeText}>ADMIN MODE</Text>
      </View>
      {children}
    </>
  );
};

const createStyles = (Colors: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Colors.background,
      padding: 20,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 14,
      color: Colors.textLight,
    },
    errorCard: {
      backgroundColor: Colors.white,
      padding: 32,
      borderRadius: 20,
      alignItems: 'center',
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
    },
    errorTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: Colors.error,
      marginTop: 16,
      marginBottom: 12,
    },
    errorMessage: {
      fontSize: 15,
      color: Colors.text,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 22,
    },
    errorSubtext: {
      fontSize: 13,
      color: Colors.textLight,
      marginBottom: 8,
    },
    roleText: {
      fontWeight: '700',
      color: Colors.primary,
      textTransform: 'uppercase',
    },
    redirectText: {
      fontSize: 12,
      color: Colors.textMuted,
      marginTop: 16,
      fontStyle: 'italic',
    },
    adminBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: Colors.error,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      zIndex: 1000,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    adminBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: Colors.white,
      letterSpacing: 0.5,
    },
  });

export default ProtectedAdminRoute;
