/**
 * Accessibility Helpers
 * 
 * Utilities for improving app accessibility
 * WCAG 2.1 Level AA compliance
 */

import { AccessibilityInfo, Platform, findNodeHandle } from 'react-native';

/**
 * Check if screen reader is enabled
 */
export async function isScreenReaderEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch {
    return false;
  }
}

/**
 * Announce message to screen reader
 */
export function announceForAccessibility(message: string): void {
  AccessibilityInfo.announceForAccessibility(message);
}

/**
 * Generate accessibility label for price
 */
export function priceAccessibilityLabel(price: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    return `${price} rupees`;
  }
  return `${price} ${currency}`;
}

/**
 * Generate accessibility label for rating
 */
export function ratingAccessibilityLabel(rating: number, maxRating: number = 5): string {
  return `Rated ${rating} out of ${maxRating} stars`;
}

/**
 * Generate accessibility label for date
 */
export function dateAccessibilityLabel(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generate accessibility label for time
 */
export function timeAccessibilityLabel(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours || '0', 10);
  const m = parseInt(minutes || '0', 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Generate accessibility label for percentage
 */
export function percentageAccessibilityLabel(value: number): string {
  return `${value} percent`;
}

/**
 * Generate accessibility label for count
 */
export function countAccessibilityLabel(count: number, singular: string, plural?: string): string {
  if (count === 1) {
    return `${count} ${singular}`;
  }
  return `${count} ${plural || singular + 's'}`;
}

/**
 * Generate accessibility hint for button
 */
export function buttonAccessibilityHint(action: string): string {
  return `Double tap to ${action}`;
}

/**
 * Generate accessibility label for toggle
 */
export function toggleAccessibilityLabel(isOn: boolean, feature: string): string {
  return `${feature} is ${isOn ? 'on' : 'off'}`;
}

/**
 * Generate accessibility hint for toggle
 */
export function toggleAccessibilityHint(feature: string): string {
  return `Double tap to toggle ${feature}`;
}

/**
 * Check color contrast ratio (WCAG AA requires 4.5:1 for normal text)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Calculate relative luminance
    const lums = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    const [rs, gs, bs] = lums;
    return 0.2126 * (rs ?? 0) + 0.7152 * (gs ?? 0) + 0.0722 * (bs ?? 0);
  };

  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color contrast meets WCAG AA standards
 */
export function meetsWCAGAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if color contrast meets WCAG AAA standards
 */
export function meetsWCAGAAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Accessibility props for touchable elements
 */
export interface AccessibleTouchableProps {
  accessible: true;
  accessibilityRole: 'button' | 'link' | 'imagebutton' | 'switch' | 'checkbox' | 'radio';
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | 'mixed';
    busy?: boolean;
    expanded?: boolean;
  };
}

/**
 * Create accessibility props for button
 */
export function createButtonA11yProps(
  label: string,
  hint?: string,
  disabled: boolean = false
): AccessibleTouchableProps {
  return {
    accessible: true,
    accessibilityRole: 'button',
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: { disabled },
  };
}

/**
 * Create accessibility props for link
 */
export function createLinkA11yProps(
  label: string,
  hint?: string
): AccessibleTouchableProps {
  return {
    accessible: true,
    accessibilityRole: 'link',
    accessibilityLabel: label,
    accessibilityHint: hint,
  };
}

/**
 * Create accessibility props for switch/toggle
 */
export function createSwitchA11yProps(
  label: string,
  isOn: boolean,
  hint?: string
): AccessibleTouchableProps {
  return {
    accessible: true,
    accessibilityRole: 'switch',
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: { checked: isOn },
  };
}

/**
 * Create accessibility props for checkbox
 */
export function createCheckboxA11yProps(
  label: string,
  isChecked: boolean,
  hint?: string
): AccessibleTouchableProps {
  return {
    accessible: true,
    accessibilityRole: 'checkbox',
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: { checked: isChecked },
  };
}

/**
 * Focus management - set focus to element
 */
export function setAccessibilityFocus(ref: React.RefObject<any>): void {
  if (Platform.OS === 'ios' && ref.current) {
    const tag = findNodeHandle(ref.current);
    if (tag) {
      AccessibilityInfo.setAccessibilityFocus(tag);
    }
  }
}

/**
 * Reduce motion check (for animations)
 */
export async function isReduceMotionEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
}

/**
 * Reduce transparency check
 */
export async function isReduceTransparencyEnabled(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      return await AccessibilityInfo.isReduceTransparencyEnabled();
    }
    return false;
  } catch {
    return false;
  }
}

export default {
  isScreenReaderEnabled,
  announceForAccessibility,
  priceAccessibilityLabel,
  ratingAccessibilityLabel,
  dateAccessibilityLabel,
  timeAccessibilityLabel,
  percentageAccessibilityLabel,
  countAccessibilityLabel,
  buttonAccessibilityHint,
  toggleAccessibilityLabel,
  toggleAccessibilityHint,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  createButtonA11yProps,
  createLinkA11yProps,
  createSwitchA11yProps,
  createCheckboxA11yProps,
  setAccessibilityFocus,
  isReduceMotionEnabled,
  isReduceTransparencyEnabled,
};
