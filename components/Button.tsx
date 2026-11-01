/**
 * Premium Button Component
 * 
 * High-fidelity button with haptics, spring animations, and gradients.
 */

import React from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Pressable,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  interpolate 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { Gradients, Shadows, Radii, Transitions, Typography } from '@/constants/theme';

// ============================================
// TYPES
// ============================================

type ButtonVariant = 'primary' | 'purple' | 'gold' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

// ============================================
// COMPONENT
// ============================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button = React.memo(function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  containerStyle,
  textStyle,
  testID,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(scale.value, [0.95, 1], [0.8, 1]),
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, Transitions.spring);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Transitions.spring);
  };

  const getGradientColors = (): readonly [string, string, ...string[]] => {
    if (disabled) return [Colors.border, Colors.border];
    switch (variant) {
      case 'primary': return Gradients.primary;
      case 'purple': return Gradients.purple;
      case 'gold': return Gradients.gold;
      case 'danger': return Gradients.danger;
      default: return ['transparent', 'transparent'];
    }
  };

  const getTextColor = (): string => {
    if (disabled) return Colors.textMuted;
    switch (variant) {
      case 'outline': return Colors.primary;
      case 'ghost': return Colors.primary;
      default: return '#FFFFFF';
    }
  };

  return (
    <AnimatedPressable
      testID={testID}
      disabled={disabled || loading}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.container,
        fullWidth && styles.fullWidth,
        containerStyle,
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.button,
          variant === 'outline' && { borderWidth: 1.5, borderColor: Colors.primary },
          variant === 'ghost' && { backgroundColor: 'transparent' },
          size === 'sm' && styles.sizeSm,
          size === 'md' && styles.sizeMd,
          size === 'lg' && styles.sizeLg,
          !disabled && variant !== 'ghost' && variant !== 'outline' && Shadows.soft,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={getTextColor()} />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <Ionicons name={icon} size={size === 'sm' ? 18 : 22} color={getTextColor()} style={styles.leftIcon} />
            )}
            <Text style={[styles.text, { color: getTextColor(), fontSize: size === 'sm' ? 14 : size === 'lg' ? 18 : 16 }, textStyle]}>
              {title}
            </Text>
            {icon && iconPosition === 'right' && (
              <Ionicons name={icon} size={size === 'sm' ? 18 : 22} color={getTextColor()} style={styles.rightIcon} />
            )}
          </>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.md,
  },
  sizeSm: { paddingVertical: 8, paddingHorizontal: 16, minHeight: 36 },
  sizeMd: { paddingVertical: 14, paddingHorizontal: 24, minHeight: 48 },
  sizeLg: { paddingVertical: 18, paddingHorizontal: 32, minHeight: 56 },
  fullWidth: { width: '100%' },
  text: { fontWeight: '700', letterSpacing: 0.5, fontFamily: Typography.bold },
  leftIcon: { marginRight: 10 },
  rightIcon: { marginLeft: 10 },
});

export default Button;
