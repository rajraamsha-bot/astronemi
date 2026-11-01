/**
 * Feature Error Boundary
 * 
 * Wraps critical feature areas (payments, video calls, chat) with
 * isolated error boundaries so a crash in one feature doesn't take down the whole app.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, RefreshCcw } from 'lucide-react-native';
import { errorReporting } from '@/services/error-reporting';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  featureName: string;
  resetKeys?: (string | number)[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  remountCounter: number;
}

export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, remountCounter: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    errorReporting.captureException(error, {
      extra: { componentStack: errorInfo.componentStack, feature: this.props.featureName },
      tags: { type: 'feature_error_boundary', feature: this.props.featureName },
    });
  }

  handleReset = (): void => {
    const { resetKeys } = this.props;
    if (resetKeys && resetKeys.length > 0) {
      const fingerprint = JSON.stringify(resetKeys);
      const prev = (this.state as unknown as { __rf?: string }).__rf;
      if (fingerprint !== prev) {
        this.setState((s) => ({
          hasError: false,
          error: null,
          remountCounter: s.remountCounter + 1,
          __rf: fingerprint,
        }));
        return;
      }
    }
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, remountCounter } = this.state;

    if (hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.container}>
          <AlertCircle color="#E53E3E" size={48} />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            {this.props.featureName} encountered an error.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={this.handleReset}>
            <RefreshCcw size={16} color="#FFF" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <React.Fragment key={`feature-eb-${remountCounter}`}>
        {this.props.children}
      </React.Fragment>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8F4FF',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B46C1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  retryText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
