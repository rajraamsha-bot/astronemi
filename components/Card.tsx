/**
 * React Native Best Practices: Card Component
 *
 * High-fidelity, accessible card component with:
 * - Proper TypeScript typing (no `any`)
 * - Accessibility support
 * - Responsive design
 * - Performance optimization
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { Shadows, Radii, Transitions, Gradients, Typography } from '@/constants/theme';

// ============================================
// GLOBAL DECLARATION
// ============================================

declare global {
  var __TEST__: boolean | undefined;
}

// ============================================
// TYPES - Properly typed, no `any`
// ============================================

type Variant = 'default' | 'elevated' | 'glass' | 'filled';
type Padding = 'none' | 'sm' | 'md' | 'lg';
type BorderRadius = keyof typeof Radii;

type CardAction = () => void;

interface CardBaseProps {
  children: React.ReactNode;
  variant?: Variant;
  padding?: Padding;
  borderRadius?: BorderRadius;
  style?: StyleProp<ViewStyle>;
  onPress?: CardAction;
  gradient?: boolean;
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: React.ReactNode;
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
}

// ============================================
// ANIMATED COMPONENT
// ============================================

const isTestEnv = typeof global.__TEST__ !== 'undefined' && global.__TEST__;

// Use regular Pressable in test environments to avoid animation complexity
const AnimatedPressable = isTestEnv
  ? Pressable
  : Animated.createAnimatedComponent(Pressable);

// ============================================
// CARD COMPONENT
// ============================================

export const Card = React.memo(function Card({
  children,
  variant = 'default',
  padding = 'md',
  borderRadius = 'lg',
  style,
  onPress,
  gradient = false,
  testID,
  accessible = true,
  accessibilityLabel,
}: CardBaseProps): React.ReactElement {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (): void => {
    if (onPress) {
      if (!isTestEnv) {
        void Haptics.selectionAsync().catch(() => {});
        scale.value = withSpring(0.98, Transitions.spring);
      }
    }
  };

  const handlePressOut = (): void => {
    if (onPress && !isTestEnv) {
      scale.value = withSpring(1, Transitions.spring);
    }
  };

  const getPadding = (): number => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return 10;
      case 'md':
        return 16;
      case 'lg':
        return 24;
      default:
        return 16;
    }
  };

  const getBorderRadius = (): number => {
    return Radii[borderRadius];
  };

  const content = (
    <LinearGradient
      colors={gradient ? Gradients.purple : ['transparent', 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        {
          padding: getPadding(),
          borderRadius: getBorderRadius(),
        },
        variant === 'elevated' && Shadows.soft,
        variant === 'glass' && styles.glass,
        variant === 'filled' && { backgroundColor: Colors.background },
        variant === 'default' && {
          backgroundColor: Colors.white,
          borderWidth: 1,
          borderColor: Colors.border,
        },
      ]}
    >
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        testID={testID}
        accessible={accessible}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          isTestEnv ? {} : animatedStyle,
          style,
        ]}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <View
      testID={testID}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      style={style}
    >
      {content}
    </View>
  );
});

// ============================================
// CARD HEADER COMPONENT
// ============================================

export const CardHeader = React.memo(function CardHeader({
  title,
  subtitle,
  icon,
  action,
  testID,
  accessible = true,
  accessibilityLabel,
}: CardHeaderProps): React.ReactElement {
  return (
    <View
      testID={testID}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        {icon && (
          <View style={styles.iconCircle}>
            <Ionicons name={icon} size={20} color={Colors.primary} />
          </View>
        )}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {action}
    </View>
  );
});

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF4F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    fontFamily: Typography.bold,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
    fontFamily: Typography.medium,
  },
});

export default Card;