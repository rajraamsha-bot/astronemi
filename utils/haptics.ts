/**
 * Haptic Feedback Utility
 *
 * Provides tactile responses throughout the app for a premium feel.
 * Wraps expo-haptics with safe fallbacks for unsupported platforms.
 */

import { Platform } from 'react-native';

let Haptics: typeof import('expo-haptics') | null = null;

// Lazy-load expo-haptics (it may not be installed in all environments)
try {
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics not available — all calls become no-ops
}

/**
 * Light tap — use for selections, toggles, tab switches
 */
export async function tapLight(): Promise<void> {
  if (!Haptics || Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

/**
 * Medium tap — use for button presses, card interactions
 */
export async function tapMedium(): Promise<void> {
  if (!Haptics || Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
}

/**
 * Heavy tap — use for significant actions: payment, kundli generation
 */
export async function tapHeavy(): Promise<void> {
  if (!Haptics || Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {}
}

/**
 * Success feedback — use after payment success, kundli saved, etc.
 */
export async function notifySuccess(): Promise<void> {
  if (!Haptics || Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

/**
 * Error feedback — use after failed payment, validation error
 */
export async function notifyError(): Promise<void> {
  if (!Haptics || Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {}
}

/**
 * Warning feedback — use for destructive actions, confirmations
 */
export async function notifyWarning(): Promise<void> {
  if (!Haptics || Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {}
}

/**
 * Selection changed — ultra-light, for scroll pickers, zodiac carousel
 */
export async function selectionChanged(): Promise<void> {
  if (!Haptics || Platform.OS === 'web') return;
  try {
    await Haptics.selectionAsync();
  } catch {}
}
