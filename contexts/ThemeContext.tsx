import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/services/logger';
import { useColorScheme, StyleSheet } from 'react-native';
import StaticColors from '@/constants/colors';

// Light theme colors
export const lightTheme = {
  mode: 'light' as const,
  background: '#F5F5F5',
  white: '#FFFFFF',
  text: '#1A1A1A',
  textLight: '#666666',
  textMuted: '#999999',
  primary: '#6B46C1',
  primaryLight: '#9F7AEA',
  primaryDark: '#553C9A',
  secondary: '#E91E63',
  border: '#E0E0E0',
  card: '#FFFFFF',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  inputBg: '#FFFFFF',
  inputBorder: '#E0E0E0',
  headerBg: '#6B46C1',
  headerText: '#FFFFFF',
  tabBg: '#FFFFFF',
  tabActive: '#6B46C1',
  tabInactive: '#666666',
};

// Dark theme colors
export const darkTheme = {
  mode: 'dark' as const,
  background: '#0D0E12', // Richer midnight black
  white: '#1A1B23',      // Subtle deep blue-gray
  text: '#F9FAFB',       // Off-white for less eye strain
  textLight: '#94A3B8',  // Cool gray
  textMuted: '#64748B',  // Muted steel
  primary: '#A78BFA',    // Vibrant lavender
  primaryLight: '#C4B5FD',
  primaryDark: '#7C3AED',
  secondary: '#F472B6',  // Vivid pink
  border: '#1F2937',     // Dark border
  card: '#161922',       // Premium card depth
  success: '#34D399',
  warning: '#FBBF24',
  error: '#FB7185',
  info: '#60A5FA',
  overlay: 'rgba(0, 0, 0, 0.8)',
  shadow: 'rgba(0, 0, 0, 0.5)',
  inputBg: '#1F2937',
  inputBorder: '#374151',
  headerBg: '#0D0E12',
  headerText: '#FFFFFF',
  tabBg: '#0D0E12',
  tabActive: '#A78BFA',
  tabInactive: '#64748B',
};

type Theme = typeof lightTheme;

interface ThemeContextType {
  theme: typeof lightTheme | typeof darkTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  themeMode: 'light' | 'dark' | 'system';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@astrofusion_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');

  // Derived state - computed directly from themeMode and systemColorScheme (replaces useEffect)
  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  // effect:audited — Initialization: Load saved theme preference from AsyncStorage
  // This MUST be a useEffect because it reads from persistent storage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode) {
          setThemeMode(savedMode as 'light' | 'dark' | 'system');
        }
      } catch (error) {
        Logger.error('Error loading theme:', error);
      }
    };
    // Load in background without blocking
    loadTheme().catch(err => Logger.error('Error in loadTheme:', err));
  }, []);

  const theme = useMemo(() => isDark ? darkTheme : lightTheme, [isDark]);

  const toggleTheme = async () => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      Logger.error('Error saving theme:', error);
    }
  };

  const handleSetThemeMode = async (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      Logger.error('Error saving theme mode:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        toggleTheme,
        setThemeMode: handleSetThemeMode,
        themeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return default light theme if context is not available
    return {
      theme: lightTheme,
      isDark: false,
      toggleTheme: () => {},
      setThemeMode: () => {},
      themeMode: 'system' as const,
    };
  }
  return context;
}

// Helper function to create themed styles
export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  styleCreator: (theme: Theme) => T
) {
  return (theme: Theme) => StyleSheet.create(styleCreator(theme));
}

export function useAppTheme() {
  const { theme, isDark } = useTheme();
  return useMemo(() => ({
    ...StaticColors,
    ...theme,
    isDark
  }), [theme, isDark]);
}

export type AppTheme = ReturnType<typeof useAppTheme>;

export { ThemeContext };