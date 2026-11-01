/**
 * Global TypeScript Fixes
 * 
 * Type declarations for dynamically imported third-party SDKs
 * and external API result types.
 */

// React Native Razorpay
declare module 'react-native-razorpay' {
  const RazorpayCheckout: {
    open(options: Record<string, unknown>): Promise<Record<string, unknown>>;
  };
  export default RazorpayCheckout;
}

// Sentry React Native
declare module '@sentry/react-native' {
  export function init(options: Record<string, unknown>): void;
  export function setUser(user: Record<string, unknown> | null): void;
  export function setTag(key: string, value: string): void;
  export function setExtra(key: string, value: unknown): void;
  export function captureException(error: Error, options?: Record<string, unknown>): void;
  export function captureMessage(message: string, options?: Record<string, unknown>): void;
  export function addBreadcrumb(breadcrumb: Record<string, unknown>): void;
  export function startTransaction(options: Record<string, unknown>): Record<string, unknown>;
  export class ReactNativeTracing { constructor(options: Record<string, unknown>); }
  export class ReactNavigationInstrumentation { constructor(); }
}

// React Native Agora
declare module 'react-native-agora' {
  export function createAgoraRtcEngine(): Record<string, unknown>;
}

// NetInfo
declare module '@react-native-community/netinfo' {
  export function addEventListener(callback: (state: { isConnected?: boolean }) => void): () => void;
  export function fetch(): Promise<{ isConnected: boolean }>;
}

// React Native Camera
declare module 'react-native-vision-camera' {
  export const Camera: unknown;
  export function useCameraDevice(front: string): Record<string, unknown> | undefined;
  export function useCameraPermission(): { hasPermission: boolean; requestPermission: () => Promise<boolean> };
  export function useMicrophonePermission(): { hasPermission: boolean; requestPermission: () => Promise<boolean> };
}

// Payment SDKs (Stripe, etc.)
declare module '@stripe/stripe-react-native' {
  export function initPaymentSheet(options: Record<string, unknown>): Promise<Record<string, unknown>>;
  export function presentPaymentSheet(): Promise<Record<string, unknown>>;
  export function confirmPaymentSheetPayment(): Promise<Record<string, unknown>>;
  export function isApplePaySupported(): Promise<boolean>;
  export function isGooglePaySupported(): Promise<boolean>;
  export function initApplePay(options: Record<string, unknown>): Promise<boolean>;
  export function presentApplePay(options: Record<string, unknown>): Promise<Record<string, unknown>>;
  export function confirmApplePayPayment(clientSecret: string): Promise<Record<string, unknown>>;
  export function initGooglePay(options: Record<string, unknown>): Promise<boolean>;
  export function presentGooglePay(options: Record<string, unknown>): Promise<Record<string, unknown>>;
}