/**
 * LoadingState Component
 * 
 * Reusable loading indicator with optional message
 */

import React, { memo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

export interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

/**
 * Reusable loading indicator with optional message
 * Memoized for performance optimization
 */
export const LoadingState = memo(function LoadingState({
  message,
  size = 'large',
  fullScreen = false,
}: LoadingStateProps) {
  const content = (
    <>
      <ActivityIndicator size={size} color={Colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </>
  );

  if (fullScreen) {
    return <View style={styles.fullScreen}>{content}</View>;
  }

  return <View style={styles.container}>{content}</View>;
});

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default LoadingState;
