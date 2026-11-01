/**
 * SkeletonLoader — Premium shimmer animation component
 *
 * Provides a smooth, animated placeholder while content loads.
 * Uses React Native Animated API for performant native-driven animations.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonLoaderProps {
  /** Width of the skeleton block */
  width: number | `${number}%`;
  /** Height of the skeleton block */
  height: number;
  /** Border radius (default: 8) */
  borderRadius?: number;
  /** Additional container style */
  style?: ViewStyle;
}

export function SkeletonLoader({
  width,
  height,
  borderRadius = 8,
  style,
}: SkeletonLoaderProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const containerStyle = useMemo(
    () => ({
      width,
      height,
      borderRadius,
    }),
    [width, height, borderRadius]
  );

  return (
    <View style={[styles.container, containerStyle, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            borderRadius,
            opacity,
          },
        ]}
      />
    </View>
  );
}

/** Preset: Card-shaped skeleton for astrologer/content cards */
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardRow}>
        <SkeletonLoader width={48} height={48} borderRadius={24} />
        <View style={styles.cardTextCol}>
          <SkeletonLoader width={120} height={14} borderRadius={4} />
          <SkeletonLoader
            width={80}
            height={10}
            borderRadius={4}
            style={styles.mt6}
          />
        </View>
      </View>
      <SkeletonLoader
        width="100%"
        height={12}
        borderRadius={4}
        style={styles.mt12}
      />
      <SkeletonLoader
        width="70%"
        height={12}
        borderRadius={4}
        style={styles.mt6}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#E8E3F3',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#D4CCE8',
  },
  card: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTextCol: {
    marginLeft: 12,
    flex: 1,
  },
  mt6: { marginTop: 6 },
  mt12: { marginTop: 12 },
});
