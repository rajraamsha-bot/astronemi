/**
 * Accessibility Service
 * 
 * Handles accessibility features for screen readers and assistive technologies
 */

import { AccessibilityInfo, Platform, findNodeHandle } from 'react-native';

// Accessibility announcement types
export enum AnnouncementType {
  POLITE = 'polite',
  ASSERTIVE = 'assertive',
}

// Accessibility role types
export const AccessibilityRoles = {
  BUTTON: 'button',
  LINK: 'link',
  SEARCH: 'search',
  IMAGE: 'image',
  TEXT: 'text',
  ADJUSTABLE: 'adjustable',
  IMAGEBUTTON: 'imagebutton',
  HEADER: 'header',
  SUMMARY: 'summary',
  ALERT: 'alert',
  CHECKBOX: 'checkbox',
  COMBOBOX: 'combobox',
  MENU: 'menu',
  MENUBAR: 'menubar',
  MENUITEM: 'menuitem',
  NONE: 'none',
  PROGRESSBAR: 'progressbar',
  RADIO: 'radio',
  RADIOGROUP: 'radiogroup',
  SCROLLBAR: 'scrollbar',
  SPINBUTTON: 'spinbutton',
  SWITCH: 'switch',
  TAB: 'tab',
  TABLIST: 'tablist',
  TABPANEL: 'tabpanel',
  TEXTBOX: 'textbox',
  TIMER: 'timer',
  TOOLBAR: 'toolbar',
  TOOLTIP: 'tooltip',
} as const;

// Accessibility state
export interface AccessibilityState {
  screenReaderEnabled: boolean;
  reduceMotionEnabled: boolean;
  boldTextEnabled: boolean;
  grayscaleEnabled: boolean;
  invertColorsEnabled: boolean;
}

// ─── Accessibility Props Interfaces ────────────────────────────────────────────

export interface AccessibilityTouchableProps {
  accessible: true;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    expanded?: boolean;
  };
  onAccessibilityTap?: () => void;
}

export interface AccessibilityImageProps {
  accessible: true;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
}

export interface AccessibilityTextProps {
  accessible: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: string;
}

export interface AccessibilityHeaderProps {
  accessible: true;
  accessibilityLabel: string;
  accessibilityRole?: string;
}

export interface AccessibilityListItemProps {
  accessible: true;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityState?: {
    position?: number;
    count?: number;
  };
}

export interface AccessibilityProgressProps {
  accessible: true;
  accessibilityLabel: string;
  accessibilityRole?: string;
  accessibilityValue?: {
    min: number;
    max: number;
    now: number;
    text: string;
  };
}

export interface AccessibilityCheckboxProps {
  accessible: true;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  accessibilityState?: {
    checked?: boolean;
  };
}

export interface AccessibilitySwitchProps {
  accessible: true;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  accessibilityState?: {
    checked?: boolean;
  };
}

export interface AccessibilityTabProps {
  accessible: true;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  accessibilityState?: {
    selected?: boolean;
  };
}

export interface AccessibilityAlertProps {
  accessible: true;
  accessibilityLabel: string;
  accessibilityRole?: string;
  accessibilityLiveRegion?: 'polite' | 'assertive';
}

// ─── Accessibility Service ─────────────────────────────────────────────────────

class AccessibilityService {
  private state: AccessibilityState = {
    screenReaderEnabled: false,
    reduceMotionEnabled: false,
    boldTextEnabled: false,
    grayscaleEnabled: false,
    invertColorsEnabled: false,
  };
  private listeners: ((state: AccessibilityState) => void)[] = [];

  // ... rest of the class

/**
   * Initialize accessibility service
   */
  async initialize(): Promise<void> {
    // Check initial states
    await this.checkScreenReader();
    await this.checkReduceMotion();
    await this.checkBoldText();
    await this.checkGrayscale();
    await this.checkInvertColors();

    // Set up listeners
    this.setupListeners();
  }

  private subscriptions: Array<ReturnType<typeof AccessibilityInfo.addEventListener>> = [];

  /**
   * Set up accessibility change listeners
   */
  private setupListeners(): void {
    // Clean up any existing listeners before re-registering
    this.cleanupListeners();

    // Screen reader changes
    this.subscriptions.push(
      AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
        this.state.screenReaderEnabled = enabled;
        this.notifyListeners();
      })
    );

    // Reduce motion changes (iOS only)
    if (Platform.OS === 'ios') {
      this.subscriptions.push(
        AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
          this.state.reduceMotionEnabled = enabled;
          this.notifyListeners();
        })
      );

      this.subscriptions.push(
        AccessibilityInfo.addEventListener('boldTextChanged', (enabled) => {
          this.state.boldTextEnabled = enabled;
          this.notifyListeners();
        })
      );

      this.subscriptions.push(
        AccessibilityInfo.addEventListener('grayscaleChanged', (enabled) => {
          this.state.grayscaleEnabled = enabled;
          this.notifyListeners();
        })
      );

      this.subscriptions.push(
        AccessibilityInfo.addEventListener('invertColorsChanged', (enabled) => {
          this.state.invertColorsEnabled = enabled;
          this.notifyListeners();
        })
      );
    }
  }

  /**
   * Clean up all event listeners
   */
  private cleanupListeners(): void {
    this.subscriptions.forEach(sub => sub?.remove());
    this.subscriptions = [];
  }

  /**
   * Check if screen reader is enabled
   */
  private async checkScreenReader(): Promise<void> {
    const enabled = await AccessibilityInfo.isScreenReaderEnabled();
    this.state.screenReaderEnabled = enabled;
  }

  /**
   * Check if reduce motion is enabled
   */
  private async checkReduceMotion(): Promise<void> {
    if (Platform.OS === 'ios') {
      const enabled = await AccessibilityInfo.isReduceMotionEnabled();
      this.state.reduceMotionEnabled = enabled;
    }
  }

  /**
   * Check if bold text is enabled
   */
  private async checkBoldText(): Promise<void> {
    if (Platform.OS === 'ios') {
      const enabled = await AccessibilityInfo.isBoldTextEnabled();
      this.state.boldTextEnabled = enabled;
    }
  }

  /**
   * Check if grayscale is enabled
   */
  private async checkGrayscale(): Promise<void> {
    if (Platform.OS === 'ios') {
      const enabled = await AccessibilityInfo.isGrayscaleEnabled();
      this.state.grayscaleEnabled = enabled;
    }
  }

  /**
   * Check if invert colors is enabled
   */
  private async checkInvertColors(): Promise<void> {
    if (Platform.OS === 'ios') {
      const enabled = await AccessibilityInfo.isInvertColorsEnabled();
      this.state.invertColorsEnabled = enabled;
    }
  }

  /**
   * Get current accessibility state
   */
  getState(): AccessibilityState {
    return { ...this.state };
  }

  /**
   * Check if screen reader is enabled
   */
  isScreenReaderEnabled(): boolean {
    return this.state.screenReaderEnabled;
  }

  /**
   * Check if reduce motion is enabled
   */
  isReduceMotionEnabled(): boolean {
    return this.state.reduceMotionEnabled;
  }

  /**
   * Add state change listener
   */
  addListener(listener: (state: AccessibilityState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /**
   * Announce a message to screen reader users
   */
  announce(message: string, _type: AnnouncementType = AnnouncementType.POLITE): void {
    AccessibilityInfo.announceForAccessibility(message);
  }

  /**
   * Set accessibility focus to a component
   */
  setFocusToComponent<T>(ref: React.RefObject<T>): void {
    if (ref.current) {
      const tag = findNodeHandle(ref.current as any);
      if (tag) {
        AccessibilityInfo.setAccessibilityFocus(tag);
      }
    }
  }

  /**
   * Get accessibility props for a touchable component
   */
  getTouchableProps(options: {
    label: string;
    hint?: string;
    role?: string;
    disabled?: boolean;
    selected?: boolean;
    expanded?: boolean;
    onAccessibilityTap?: () => void;
  }): AccessibilityTouchableProps {
    return {
      accessible: true,
      accessibilityLabel: options.label,
      accessibilityHint: options.hint,
      accessibilityRole: options.role || AccessibilityRoles.BUTTON,
      accessibilityState: {
        disabled: options.disabled,
        selected: options.selected,
        expanded: options.expanded,
      },
      onAccessibilityTap: options.onAccessibilityTap,
    };
  }

  /**
   * Get accessibility props for an image
   */
  getImageProps(options: {
    label: string;
    hint?: string;
  }): AccessibilityImageProps {
    return {
      accessible: true,
      accessibilityLabel: options.label,
      accessibilityHint: options.hint,
      accessibilityRole: AccessibilityRoles.IMAGE,
    };
  }

  /**
   * Get accessibility props for a text component
   */
  getTextProps(options: {
    label?: string;
    role?: string;
  }): AccessibilityTextProps {
    return {
      accessible: !!options.label,
      accessibilityLabel: options.label,
      accessibilityRole: options.role || AccessibilityRoles.TEXT,
    };
  }

  /**
   * Get accessibility props for a header
   */
  getHeaderProps(options: {
    label: string;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
  }): AccessibilityHeaderProps {
    return {
      accessible: true,
      accessibilityLabel: options.label,
      accessibilityRole: AccessibilityRoles.HEADER,
      // On iOS, header level is not directly supported
      // On Android, it's handled by the role
    };
  }

  /**
   * Get accessibility props for a list item
   */
  getListItemProps(options: {
    label: string;
    hint?: string;
    position?: number;
    count?: number;
  }): AccessibilityListItemProps {
    const props: AccessibilityListItemProps = {
      accessible: true,
      accessibilityLabel: options.label,
      accessibilityHint: options.hint,
    };

    // Add position info for screen readers
    if (options.position !== undefined && options.count !== undefined) {
      props.accessibilityLabel = `${options.label}, ${options.position} of ${options.count}`;
    }

    return props;
  }

  /**
   * Get accessibility props for a progress indicator
   */
  getProgressProps(options: {
    label: string;
    value: number;
    min?: number;
    max?: number;
  }): AccessibilityProgressProps {
    const min = options.min ?? 0;
    const max = options.max ?? 100;
    const percentage = Math.round(((options.value - min) / (max - min)) * 100);

    return {
      accessible: true,
      accessibilityLabel: `${options.label}, ${percentage}% complete`,
      accessibilityRole: AccessibilityRoles.PROGRESSBAR,
      accessibilityValue: {
        min,
        max,
        now: options.value,
        text: `${percentage}%`,
      },
    };
  }

  /**
   * Get accessibility props for a checkbox
   */
getCheckboxProps(options: {
    label: string;
    checked: boolean;
    hint?: string;
  }): AccessibilityCheckboxProps {
    return {
      accessible: true,
      accessibilityLabel: options.label,
      accessibilityHint: options.hint,
      accessibilityRole: AccessibilityRoles.CHECKBOX,
      accessibilityState: {
        checked: options.checked,
      },
    };
  }

  /**
   * Get accessibility props for a switch/toggle
   */
getSwitchProps(options: {
    label: string;
    value: boolean;
    hint?: string;
  }): AccessibilitySwitchProps {
    return {
      accessible: true,
      accessibilityLabel: options.label,
      accessibilityHint: options.hint,
      accessibilityRole: AccessibilityRoles.SWITCH,
      accessibilityState: {
        checked: options.value,
      },
    };
  }

  /**
   * Get accessibility props for a tab
   */
  getTabProps(options: {
    label: string;
    selected: boolean;
    hint?: string;
  }): AccessibilityTabProps {
    return {
      accessible: true,
      accessibilityLabel: options.label,
      accessibilityHint: options.hint,
      accessibilityRole: AccessibilityRoles.TAB,
      accessibilityState: {
        selected: options.selected,
      },
    };
  }

  /**
   * Get accessibility props for an alert
   */
  getAlertProps(options: {
    label: string;
    type?: 'error' | 'warning' | 'info' | 'success';
  }): AccessibilityAlertProps {
    return {
      accessible: true,
      accessibilityLabel: `${options.type || 'Alert'}: ${options.label}`,
      accessibilityRole: AccessibilityRoles.ALERT,
      accessibilityLiveRegion: 'assertive',
    };
  }

  /**
   * Get animation duration based on reduce motion setting
   */
  getAnimationDuration(normalDuration: number): number {
    if (this.state.reduceMotionEnabled) {
      return 0; // Instant if reduce motion is enabled
    }
    return normalDuration;
  }

  /**
   * Check if animations should be disabled
   */
  shouldDisableAnimations(): boolean {
    return this.state.reduceMotionEnabled;
  }
}

// Export singleton instance
export const accessibilityService = new AccessibilityService();

/**
 * Hook for accessibility
 */
export function useAccessibility() {
  return {
    state: accessibilityService.getState(),
    isScreenReaderEnabled: accessibilityService.isScreenReaderEnabled(),
    isReduceMotionEnabled: accessibilityService.isReduceMotionEnabled(),
    announce: accessibilityService.announce.bind(accessibilityService),
    getTouchableProps: accessibilityService.getTouchableProps.bind(accessibilityService),
    getImageProps: accessibilityService.getImageProps.bind(accessibilityService),
    getTextProps: accessibilityService.getTextProps.bind(accessibilityService),
    getHeaderProps: accessibilityService.getHeaderProps.bind(accessibilityService),
    getListItemProps: accessibilityService.getListItemProps.bind(accessibilityService),
    getProgressProps: accessibilityService.getProgressProps.bind(accessibilityService),
    getCheckboxProps: accessibilityService.getCheckboxProps.bind(accessibilityService),
    getSwitchProps: accessibilityService.getSwitchProps.bind(accessibilityService),
    getTabProps: accessibilityService.getTabProps.bind(accessibilityService),
    getAlertProps: accessibilityService.getAlertProps.bind(accessibilityService),
    getAnimationDuration: accessibilityService.getAnimationDuration.bind(accessibilityService),
    shouldDisableAnimations: accessibilityService.shouldDisableAnimations.bind(accessibilityService),
  };
}

export default accessibilityService;