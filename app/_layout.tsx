import { Stack } from 'expo-router';
import { AppProviders } from '@/components/AppProviders';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useFonts } from 'expo-font';
// Import each weight from its subpath so Metro only bundles these 4 TTFs.
// Importing from the package index pulls in the ENTIRE Inter family
// (all weights + italics, several MB) because Metro does not tree-shake
// require()'d font assets.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { errorReporting } from '@/services/error-reporting';
import { envValidation } from '@/services/environment-validation';
import { analytics } from '@/utils/analytics-tracker';
import { abTesting, registerDefaultExperiments } from '@/utils/ab-testing';
import { PushNotificationService } from '@/services/push-notification-service';
import { Logger } from '@/services/logger';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import '../i18n';

const ONBOARDING_STORAGE_KEY = '@astrofusion_has_seen_onboarding';

function OnboardingStack() {
  return (
    <Stack>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

function MainStack() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}

function NavigationRoot({ hasSeenOnboarding }: { hasSeenOnboarding: boolean }) {
  const { isHydrating } = useAuth();

  if (isHydrating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B46C1" />
      </View>
    );
  }

  return hasSeenOnboarding ? <MainStack /> : <OnboardingStack />;
}

export default function RootLayout() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    // Initialize analytics tracking
    analytics.initialize();
    analytics.trackSessionStart();
    
    // Initialize A/B testing
    abTesting.initialize();
    registerDefaultExperiments();
    
    errorReporting.init();

    const rejectionHandler = (reason: unknown) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      errorReporting.captureException(error, { tags: { type: 'unhandled_promise_rejection' } });
      analytics.trackError(error, { type: 'unhandled_promise_rejection' });
    };

    const errorHandler = (error: unknown, isFatal: boolean) => {
      const err = error instanceof Error ? error : new Error(String(error));
      errorReporting.captureException(err, {
        tags: { type: 'unhandled_error', fatal: String(isFatal) },
      });
      analytics.trackError(err, { type: 'unhandled_error', fatal: isFatal });
    };

const errorUtils = (global as typeof globalThis & {
  ErrorUtils?: {
    setGlobalHandler: (handler: (error: Error, isFatal: boolean) => void) => void;
    getGlobalHandler?: () => (error: Error, isFatal: boolean) => void;
  };
}).ErrorUtils;

// Preserve the previous global handler so we don't silently swallow the
// default React Native red-box / crash reporter in dev and release builds.
if (errorUtils) {
  const previousHandler = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
    try {
      errorHandler(error, isFatal);
    } finally {
      previousHandler?.(error, isFatal);
    }
  });
}

    const rejectionListener = (e: PromiseRejectionEvent) => {
      rejectionHandler(e.reason);
    };
    global.addEventListener?.('unhandledrejection', rejectionListener);

    const envResult = envValidation.validateAll();
    if (!envResult.isValid) {
      // SECURITY FIX: Fail hard on missing required env instead of just alerting
      const errorMessage = 'Configuration Error\n\nRequired environment variables are missing:\n\n' +
        envResult.errors.join('\n') +
        '\n\nThe app cannot start without proper configuration.';
      
      // Log for debugging
      Logger.error('CRITICAL: Missing required environment variables', {
        errors: envResult.errors,
      });
      
      // In production, prevent app startup with invalid config
      if (envValidation.isProduction()) {
        Alert.alert(
          'Critical Configuration Error',
          errorMessage,
          [{ 
            text: 'Exit', 
            onPress: () => {
              // On native platforms, you'd use a native module to exit
              // For now, throw to prevent further execution
              throw new Error('App startup blocked: Missing required environment variables');
            }
          }],
          { cancelable: false }
        );
        // Throw to prevent further initialization
        throw new Error('App startup blocked: Missing required environment variables');
      } else {
        // In development, still alert but allow continuation for debugging
        Alert.alert(
          'Development Configuration Warning',
          errorMessage + '\n\nProceeding in development mode for debugging.',
          [{ text: 'Continue' }]
        );
      }
    } else if (envResult.warnings.length > 0 && envValidation.isDebugMode()) {
      Logger.warn('Environment warnings', { warnings: envResult.warnings.join(', ') });
    }

    // Production environment validation
    if (envValidation.isProduction()) {
      // SECURITY FIX: In production, fail hard if Supabase is not configured
      if (!isSupabaseConfigured()) {
        const errorMessage = 'Critical Production Error\n\n' +
          'Supabase is not configured. This app requires Supabase for production use.\n\n' +
          'Missing: EXPO_PUBLIC_SUPABASE_URL and/or EXPO_PUBLIC_SUPABASE_ANON_KEY';
        
        Logger.error('CRITICAL: Supabase not configured in production');
        
        Alert.alert(
          'Production Configuration Error',
          errorMessage,
          [{ 
            text: 'Exit', 
            onPress: () => {
              throw new Error('App startup blocked: Supabase not configured in production');
            }
          }],
          { cancelable: false }
        );
        // Throw to prevent further initialization
        throw new Error('App startup blocked: Supabase not configured in production');
      }
    }

    // Initialize push notifications (deferred to avoid blocking UI)
    setTimeout(() => {
      PushNotificationService.initialize().catch((err: unknown) => {
        Logger.error('Failed to initialize push notifications', err instanceof Error ? err : undefined);
      });
    }, 3000);

    const checkOnboarding = async () => {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        setHasSeenOnboarding(seen === 'true');
      } catch (error) {
        Logger.error('Error checking onboarding status', error);
        setHasSeenOnboarding(false);
      }
    };
    checkOnboarding();

    return () => {
      global.removeEventListener?.('unhandledrejection', rejectionListener);
    };
  }, []);

  if (hasSeenOnboarding === null || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B46C1" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <AppProviders>
        <NavigationRoot hasSeenOnboarding={hasSeenOnboarding} />
      </AppProviders>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
});
