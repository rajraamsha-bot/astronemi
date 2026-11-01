import React, { createContext, useContext, useEffect, useState } from 'react';
import { errorReporting } from '@/services/error-reporting';
import { authService } from '@/services/auth-service';
import { User } from '@/contexts/AuthContext';

interface AppState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error: Error | null;
}

const AppStateContext = createContext<AppState>({
  user: null,
  loading: true,
  initialized: false,
  error: null,
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    loading: true,
    initialized: false,
    error: null,
  });

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize error reporting first
      errorReporting.init();

      // NOTE: Do NOT call RateLimiter.resetAll() here — that would clear
      // rate limits on every app launch, bypassing abuse prevention.

      // Load user
      const user = await authService.loadUser();

      setState({
        user,
        loading: false,
        initialized: true,
        error: null,
      });
    } catch (error) {
      errorReporting.captureException(error as Error, { tags: { service: 'app' } });
      setState({
        user: null,
        loading: false,
        initialized: true,
        error: error as Error,
      });
    }
  };

  const value = {
    ...state,
    reinitialize: initializeApp,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
}

export default AppProvider;