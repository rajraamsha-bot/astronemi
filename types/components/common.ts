/**
 * Common Component Types
 * 
 * Shared type definitions for React components
 */

import { ReactNode } from 'react';
import { ViewStyle, TextStyle, ImageStyle, GestureResponderEvent } from 'react-native';
import type Ionicons from '@expo/vector-icons/Ionicons';

// Base component props
export interface BaseComponentProps {
  testID?: string;
  style?: ViewStyle | TextStyle | ImageStyle;
  children?: ReactNode;
}

// Interactive component props
export interface InteractiveProps extends BaseComponentProps {
  onPress?: (event?: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  activeOpacity?: number;
}

// Icon props
export type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export interface IconProps {
  name: IoniconsName;
  size?: number;
  color?: string;
}

// Button types
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends InteractiveProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IoniconsName;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
}

// Card types
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled' | 'glass';
export type CardPadding = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps extends BaseComponentProps {
  variant?: CardVariant;
  padding?: CardPadding;
  borderRadius?: number;
  onPress?: () => void;
  gradient?: boolean;
  shadow?: boolean;
}

export interface CardHeaderProps extends BaseComponentProps {
  title: string;
  subtitle?: string;
  icon?: IoniconsName;
  action?: ReactNode;
}

// Input types
export type InputVariant = 'default' | 'outlined' | 'filled' | 'underlined';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends BaseComponentProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  variant?: InputVariant;
  size?: InputSize;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  leftIcon?: IoniconsName;
  rightIcon?: IoniconsName;
  onLeftIconPress?: () => void;
  onRightIconPress?: () => void;
}

// Modal types
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalPosition = 'center' | 'bottom' | 'top';

export interface ModalProps extends BaseComponentProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  position?: ModalPosition;
  closable?: boolean;
  backdrop?: boolean;
  backdropOpacity?: number;
  animationType?: 'slide' | 'fade' | 'none';
}

// Loading types
export type LoadingSize = 'small' | 'large';
export type LoadingVariant = 'spinner' | 'dots' | 'pulse' | 'skeleton';

export interface LoadingProps extends BaseComponentProps {
  size?: LoadingSize;
  variant?: LoadingVariant;
  color?: string;
  text?: string;
  overlay?: boolean;
}

// Avatar types
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarVariant = 'circle' | 'square' | 'rounded';

export interface AvatarProps extends BaseComponentProps {
  source?: { uri: string } | number;
  name?: string;
  size?: AvatarSize;
  variant?: AvatarVariant;
  onPress?: () => void;
  badge?: {
    count?: number;
    color?: string;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  };
}

// Badge types
export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends BaseComponentProps {
  text?: string;
  count?: number;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  max?: number;
}

// Chip types
export type ChipVariant = 'default' | 'outlined' | 'filled';
export type ChipSize = 'sm' | 'md' | 'lg';

export interface ChipProps extends BaseComponentProps {
  label: string;
  variant?: ChipVariant;
  size?: ChipSize;
  selected?: boolean;
  onPress?: () => void;
  onDelete?: () => void;
  icon?: IoniconsName;
  avatar?: string;
  disabled?: boolean;
}

// Divider types
export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerVariant = 'solid' | 'dashed' | 'dotted';

export interface DividerProps extends BaseComponentProps {
  orientation?: DividerOrientation;
  variant?: DividerVariant;
  thickness?: number;
  color?: string;
  margin?: number;
  text?: string;
}

// Switch types
export interface SwitchProps extends BaseComponentProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  trackColor?: {
    false?: string;
    true?: string;
  };
  thumbColor?: string;
}

// Checkbox types
export interface CheckboxProps extends BaseComponentProps {
  checked: boolean;
  onPress: () => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  indeterminate?: boolean;
}

// Radio types
export interface RadioProps extends BaseComponentProps {
  selected: boolean;
  onPress: () => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

// Slider types
export interface SliderProps extends BaseComponentProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  disabled?: boolean;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

// Progress types
export type ProgressVariant = 'linear' | 'circular';

export interface ProgressProps extends BaseComponentProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  size?: number;
  thickness?: number;
  color?: string;
  backgroundColor?: string;
  showValue?: boolean;
  formatValue?: (value: number, max: number) => string;
}

// Alert types
export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends BaseComponentProps {
  title?: string;
  message: string;
  variant?: AlertVariant;
  icon?: IoniconsName;
  closable?: boolean;
  onClose?: () => void;
  actions?: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'destructive';
  }>;
}

// Toast types
export type ToastPosition = 'top' | 'center' | 'bottom';
export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  position?: ToastPosition;
  duration?: number;
  icon?: IoniconsName;
  action?: {
    text: string;
    onPress: () => void;
  };
}

// Skeleton types
export interface SkeletonProps extends BaseComponentProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  animated?: boolean;
}

// Empty state types
export interface EmptyStateProps extends BaseComponentProps {
  title: string;
  description?: string;
  icon?: IoniconsName;
  image?: string;
  action?: {
    text: string;
    onPress: () => void;
  };
}

// Error boundary types
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: unknown) => void;
}

// Theme types
export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  disabled: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface ThemeTypography {
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  h4: TextStyle;
  h5: TextStyle;
  h6: TextStyle;
  body1: TextStyle;
  body2: TextStyle;
  caption: TextStyle;
  button: TextStyle;
}