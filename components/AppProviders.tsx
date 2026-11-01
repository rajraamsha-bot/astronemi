import React from 'react';
import { AppState } from 'react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { UserProvider } from '@/contexts/UserContext';
import { CartProvider } from '@/contexts/CartContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { UserEngagementProvider } from '@/contexts/UserEngagementContext';
import { AppProvider } from '@/contexts/AppContext';
import { syncManager } from '@/services/sync-manager';
import { Logger } from '@/services/logger';
import { QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';

interface AppProvidersProps {
  children: React.ReactNode;
}

onlineManager.setEventListener((setOnline) => {
  // Prefer real network reachability; previously this was wired to AppState,
  // which marks the app "online" the moment it comes to the foreground —
  // even in airplane mode — stalling queue syncs.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const NetInfo = require('@react-native-community/netinfo');
    if (NetInfo && NetInfo.addEventListener) {
      return NetInfo.addEventListener((state: { isConnected?: boolean | null }) => {
        setOnline(state.isConnected === true);
      });
    }
  } catch {
    // fall through to AppState
  }
  const sub = AppState.addEventListener('change', (state) => {
    setOnline(state === 'active');
  });
  return () => sub.remove();
});

focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => {
    handleFocus(state === 'active');
  });
  return () => subscription.remove();
});

function AuthenticatedCartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <CartProvider userId={user?.id ?? null}>{children}</CartProvider>;
}

export function AppProviders({ children }: AppProvidersProps) {
  React.useEffect(() => {
    syncManager.initialize().catch((err: Error) => {
      Logger.error('SyncManager init failed', err);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <UserProvider>
            <UserEngagementProvider>
              <AuthenticatedCartProvider>
                <LanguageProvider>
                  <ToastProvider>
                    <AppProvider>
                      {children}
                    </AppProvider>
                  </ToastProvider>
                </LanguageProvider>
              </AuthenticatedCartProvider>
            </UserEngagementProvider>
          </UserProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default AppProviders;
