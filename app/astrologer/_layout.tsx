/**
 * Astrologer Layout (PROTECTED)
 *
 * Wraps every /astrologer/* route with an auth + role guard.
 * Unauthenticated users redirect to /login. Non-astrologer users
 * redirect to /. The role is read from user_metadata.role.
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from '@/services/logger';

const DEV_BYPASS_AUTH = !isSupabaseConfigured();

export default function AstrologerLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [checking, setChecking] = useState(!DEV_BYPASS_AUTH);
  const [authorized, setAuthorized] = useState(DEV_BYPASS_AUTH);

  useEffect(() => {
    if (DEV_BYPASS_AUTH) {
      setAuthorized(true);
      setChecking(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) {
          Logger.warn('[AstrologerLayout] No session, redirecting to /login');
          router.replace('/login');
          return;
        }
        const meta = (user.user_metadata || {}) as { role?: string };
        const role = meta.role;
        if (role !== 'astrologer' && role !== 'admin') {
          Logger.warn('[AstrologerLayout] User is not an astrologer');
          router.replace('/(tabs)');
          return;
        }
        setAuthorized(true);
      } catch (e) {
        Logger.error('[AstrologerLayout] Auth check failed', e);
        router.replace('/login');
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => { cancelled = true; };
  }, [router, segments.join('/')]);

  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6B46C1" />
      </View>
    );
  }

  if (!authorized) {
    return <View style={styles.loading} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F4FF',
  },
});
