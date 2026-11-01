/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * React Native Best Practices: Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * preventing crashes and providing graceful degradation.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { errorReporting } from '@/services/error-reporting';
import Colors from '@/constants/colors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /**
   * Changing these values forces the boundary to remount its children,
   * clearing the error state. Use this to tie the boundary to data-refreshes
   * so "Try Again" doesn't immediately re-throw the same error.
   */
  resetKeys?: (string | number)[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  remountCounter: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      remountCounter: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    errorReporting.captureException(error, {
      tags: { component: 'ErrorBoundary' },
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      errorInfo,
    });
  }

  /**
   * Reset the boundary. If `resetKeys` are supplied and any changed since the
   * last fallback, bump the remount counter so `key={...}` forces a fresh
   * React tree instead of re-throwing the same error.
   */
  handleReset = (): void => {
    const { resetKeys } = this.props;
    if (resetKeys && resetKeys.length > 0) {
      const fingerprint = JSON.stringify(resetKeys);
      const prev = (this.state as unknown as { __resetFingerprint?: string }).__resetFingerprint;
      if (fingerprint !== prev) {
        this.setState((s) => ({
          hasError: false,
          error: null,
          errorInfo: null,
          remountCounter: s.remountCounter + 1,
          __resetFingerprint: fingerprint,
        }));
        return;
      }
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    this.handleReset();
    router.replace('/');
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, remountCounter } = this.state;

    if (hasError && this.props.fallback) {
      return this.props.fallback;
    }

    if (hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Ionicons name="alert-circle" size={64} color="#DC2626" />

            <Text style={styles.title}>Oops! Something went wrong</Text>

            <Text style={styles.message}>
              We encountered an unexpected error. Don&apos;t worry, your data is
              safe.
            </Text>

            {__DEV__ && error && (
              <ScrollView style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
                <Text style={styles.errorText}>{error.toString()}</Text>
                {errorInfo && (
                  <Text style={styles.errorStack}>
                    {errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={this.handleReset}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="refresh"
                  size={20}
                  color={Colors.white}
                />
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={this.handleGoHome}
                activeOpacity={0.8}
              >
                <Ionicons name="home" size={20} color={Colors.primary} />
                <Text style={styles.secondaryButtonText}>Go Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return (
      <React.Fragment key={`error-boundary-${remountCounter}`}>
        {this.props.children}
      </React.Fragment>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorDetails: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: Colors.errorLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 11,
    color: Colors.error,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  secondaryButton: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

export default ErrorBoundary;