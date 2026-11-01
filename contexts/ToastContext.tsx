/**
 * Toast Notification System
 * 
 * A simple toast notification system for React Native
 * Usage: 
 *   import { useToast } from '@/contexts/ToastContext';
 *   const { showToast } = useToast();
 *   showToast('Success!', 'success');
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a no-op function if not in provider
    return {
      toasts: [],
      showToast: () => {},
      hideToast: () => {},
    };
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { theme } = useTheme();
  const idCounterRef = useRef(0);
  const pendingTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    // Use counter-based IDs to prevent collisions when multiple toasts fire
    // within the same millisecond (Date.now() would create duplicate IDs)
    const id = (++idCounterRef.current).toString();

    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-hide after duration. Track the timer so unmounting the provider
    // doesn't leave a stale setState in flight.
    const timer = setTimeout(() => {
      pendingTimersRef.current.delete(timer);
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
    pendingTimersRef.current.add(timer);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Clear any pending auto-dismiss timers when the provider unmounts.
  useEffect(() => {
    return () => {
      pendingTimersRef.current.forEach(clearTimeout);
      pendingTimersRef.current.clear();
    };
  }, []);

  const getTypeStyles = (toastType: ToastType) => {
    switch (toastType) {
      case 'success':
        return { bg: '#4CAF50', icon: '✓' };
      case 'error':
        return { bg: '#F44336', icon: '✕' };
      case 'warning':
        return { bg: '#FF9800', icon: '⚠' };
      case 'info':
      default:
        return { bg: theme.primary || '#2196F3', icon: 'ℹ' };
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
      {children}
      
      {/* Toast Container - Rendered at root level */}
      <View style={styles.container} pointerEvents="none">
        {toasts.map(toast => {
          const typeStyles = getTypeStyles(toast.type);
          return (
            <Animated.View
              key={toast.id}
              style={[
                styles.toast,
                { backgroundColor: typeStyles.bg },
              ]}
            >
              <View style={styles.toastContent}>
                <Text style={styles.icon}>{typeStyles.icon}</Text>
                <Text style={styles.message} numberOfLines={2}>
                  {toast.message}
                </Text>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  toast: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    color: '#fff',
    marginRight: 12,
    fontWeight: 'bold',
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
});

export default ToastProvider;
