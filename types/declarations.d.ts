// Type declarations for optional native modules

declare global {
  function setInterval(callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]): number;
  function setTimeout(callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]): number;
  function clearInterval(id?: number): void;
  function clearTimeout(id?: number): void;
}

declare module 'react-native-agora' {
  export const RtcEngine: unknown;
  export function createAgoraRtcEngine(config?: Record<string, unknown>): unknown;
  export const ChannelProfile: unknown;
  export const ClientRole: unknown;
  export const VideoSourceType: unknown;
  export const RenderModeType: unknown;
  export const IRtcEngineEventHandler: unknown;
  export const ErrorCode: unknown;
  export const WarningCode: unknown;
  export const RtcEngineContext: unknown;
  export const ChannelProfileType: unknown;
  export const ClientRoleType: unknown;
}

declare module 'react-native-razorpay' {
  export interface RazorpayOptions {
    description: string;
    image: string;
    currency: string;
    key: string;
    amount: number;
    order_id: string;
    name: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    theme?: {
      color?: string;
    };
    modal?: {
      ondismiss?: () => void;
    };
  }

  export interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  const RazorpayCheckout: {
    open(options: RazorpayOptions): Promise<RazorpayResponse>;
  };

  export default RazorpayCheckout;
}

declare module 'expo-sharing' {
  export function isAvailableAsync(): Promise<boolean>;
  export function shareAsync(uri: string, options?: object): Promise<void>;
}

declare module 'expo-file-system' {
  export const documentDirectory: string;
  export const cacheDirectory: string;
  export const EncodingType: {
    UTF8: string;
    Base64: string;
  };
  export const StorageAccessFramework: {
    requestReadPermissionsAsync: (uri: string) => Promise<boolean>;
    requestDirectoryPermissionsAsync: (uri?: string) => Promise<{ permissions: unknown[]; granted: boolean; directoryUri?: string }>;
    createFileAsync: (parent: string, filename: string, mimeType: string) => Promise<string>;
    writeAsStringAsync: (file: string, contents: string, options?: object) => Promise<void>;
    readAsStringAsync: (file: string, options?: object) => Promise<string>;
  };
  export function writeAsStringAsync(uri: string, contents: string, options?: object): Promise<void>;
  export function readAsStringAsync(uri: string, options?: object): Promise<string>;
}

declare module 'expo-router' {
  export * from 'expo-router/build/index';
  export { useRouter, useLocalSearchParams, useGlobalSearchParams, useSegments, usePathname } from 'expo-router/build/hooks';
}
