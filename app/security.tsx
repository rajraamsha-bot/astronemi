import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  ArrowLeft,
  Smartphone,
  Shield,
  Lock,
  Check,
  Info,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { Logger } from '@/services/logger';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

/**
 * SECURITY SCREEN — honest state, 2026-08 audit rewrite.
 *
 * Removed (all were decorative):
 *  - "Two-Factor Authentication" toggle: showed success alerts, persisted
 *    nothing, gated nothing. This app authenticates via phone OTP only.
 *  - "Change Password" / "Show Password": no passwords exist (OTP-only auth),
 *    and the buttons had no handlers.
 *  - "Login activity": the list was hardcoded fiction ("iPhone 14 Pro /
 *    Mumbai", "Samsung Galaxy S23 / Bangalore"). Replaced with an honest
 *    not-available note until a real session-history source exists.
 *
 * Wired for real:
 *  - "Sign out of all devices" → supabase.auth.signOut({ scope: 'global' }),
 *    which revokes every refresh token for the account server-side.
 *  - "Delete Account" → routes to the settings screen, which owns the real
 *    account-deletion flow (request_account_deletion RPC).
 *  - Device biometric capability is reported as informational only — nothing
 *    in the app gates on it yet.
 */
export default function SecurityScreen() {
  const [biometricType, setBiometricType] = useState<string>('');
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [signingOutEverywhere, setSigningOutEverywhere] = useState(false);
  const { t } = useLanguage();

  // effect:audited — Initialization: Check biometric availability on mount
  // Uses LocalAuthentication native API which requires useEffect
  React.useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      setIsEnrolled(enrolled);

      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Fingerprint');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      }
      // Note: IRIS_RECOGNITION may not be available on all devices
    } catch (error) {
      Logger.warn('Biometric check error', error instanceof Error ? { message: error.message } : undefined);
    }
  };

  const handleSignOutEverywhere = async () => {
    Alert.alert(
      t('security.logoutAllDevices'),
      t('security.logoutAllConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('security.logoutAllDevices'),
          style: 'destructive',
          onPress: async () => {
            setSigningOutEverywhere(true);
            try {
              // Global scope revokes ALL refresh tokens for the account on
              // the server — every other signed-in device is logged out.
              const { error } = await supabase.auth.signOut({ scope: 'global' });
              if (error) throw error;
              router.replace('/login');
            } catch (error) {
              Logger.error('Global sign-out failed', error);
              Alert.alert(t('common.error'), t('security.logoutAllFailed'));
            } finally {
              setSigningOutEverywhere(false);
            }
          },
        },
      ]
    );
  };

  return (
    <FeatureErrorBoundary featureName="Security">
    <View style={styles.container}>
      <LinearGradient
        colors={['#1B5E20', '#2E7D32', '#388E3C']}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('security.title')}</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* How your account is protected (real, not a fake score) */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Shield color={Colors.primary} size={24} />
            <Text style={styles.statusTitle}>{t('security.status')}</Text>
          </View>
          <View style={styles.statusItems}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.statusText}>{t('security.otpLogin')}</Text>
              <Text style={styles.statusValue}>{t('security.enabled')}</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.statusText}>{t('security.secureSessionStorage')}</Text>
              <Text style={styles.statusValue}>{t('security.enabled')}</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: isEnrolled ? '#4CAF50' : '#FF9800' }]} />
              <Text style={styles.statusText}>
                {biometricType ? `${t('security.deviceBiometrics')} (${biometricType})` : t('security.deviceBiometrics')}
              </Text>
              <Text style={styles.statusValue}>{isEnrolled ? t('security.availableOnDevice') : t('security.notSetUp')}</Text>
            </View>
          </View>
        </View>

        {/* Device biometrics — informational (nothing gates on it yet) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('security.biometricAuth')}</Text>
          <View style={styles.infoBox}>
            <Info color="#FF9800" size={16} />
            <Text style={styles.infoText}>
              {isEnrolled
                ? t('security.biometricInfoEnrolled')
                : t('security.biometricNotSetup')}
            </Text>
          </View>
        </View>

        {/* Login History — honest: no data source yet */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('security.recentLoginActivity')}</Text>
          <View style={styles.activityList}>
            <View style={[styles.activityItem, { borderBottomWidth: 0 }]}>
              <View style={styles.activityIcon}>
                <Smartphone color={Colors.textLight} size={16} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityDevice}>{t('security.loginHistoryUnavailable')}</Text>
                <Text style={styles.activityLocation}>{t('security.loginHistoryUnavailableDesc')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Security Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('security.tips')}</Text>
          <View style={styles.tipCard}>
            <View style={styles.tipItem}>
              <Check color="#4CAF50" size={16} />
              <Text style={styles.tipText}>{t('security.tipOtpOnly')}</Text>
            </View>
            <View style={styles.tipItem}>
              <Check color="#4CAF50" size={16} />
              <Text style={styles.tipText}>{t('security.tipSignOutShared')}</Text>
            </View>
            <View style={styles.tipItem}>
              <Check color="#4CAF50" size={16} />
              <Text style={styles.tipText}>{t('security.tipDeviceLock')}</Text>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>{t('security.dangerZone')}</Text>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleSignOutEverywhere}
            disabled={signingOutEverywhere}
          >
            {signingOutEverywhere ? (
              <ActivityIndicator color="#F44336" />
            ) : (
              <Text style={styles.dangerButtonText}>{t('security.logoutAllDevices')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dangerButton, styles.deleteButton]}
            onPress={() => router.push('/settings')}
          >
            <Lock color="#F44336" size={14} />
            <Text style={[styles.dangerButtonText, styles.deleteButtonText]}>{t('profile.deleteAccount')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
    </FeatureErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  statusCard: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  statusItems: {
    gap: 12,
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#E65100',
  },
  activityList: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityContent: {
    flex: 1,
  },
  activityDevice: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  activityLocation: {
    fontSize: 12,
    color: Colors.textLight,
  },
  tipCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipText: {
    fontSize: 13,
    color: Colors.text,
  },
  dangerSection: {
    margin: 16,
    marginTop: 0,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: 12,
  },
  dangerButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginBottom: 10,
  },
  dangerButtonText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  deleteButtonText: {
    color: '#F44336',
  },
});
