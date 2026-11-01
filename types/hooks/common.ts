/**
 * Common Hook Types
 * 
 * Shared type definitions for React hooks
 */

// Async operation state
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

// Query state with additional query-specific properties
export interface QueryState<T> extends AsyncState<T> {
  refetch: () => Promise<void>;
  isStale: boolean;
  isFetching: boolean;
  lastFetched: Date | null;
}

// Mutation state
export interface MutationState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  mutate: (variables?: unknown) => Promise<T>;
  reset: () => void;
}

// Pagination state
export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  hasPrevious: boolean;
}

// Infinite query state
export interface InfiniteQueryState<T> extends Omit<QueryState<T[]>, 'data'> {
  data: T[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  fetchNextPage: () => Promise<void>;
  fetchPreviousPage: () => Promise<void>;
  isFetchingNextPage: boolean;
  isFetchingPreviousPage: boolean;
}

// Form state
export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

// Form field state
export interface FieldState {
  value: unknown;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

// Validation rule
export interface ValidationRule<T = unknown> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: T) => string | undefined;
}

// Form configuration
export interface FormConfig<T> {
  initialValues: T;
  validationRules?: Partial<Record<keyof T, ValidationRule>>;
  onSubmit: (values: T) => Promise<void> | void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

// API hook options
export interface ApiHookOptions {
  enabled?: boolean;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
  cacheTime?: number;
  retry?: boolean | number;
  retryDelay?: number;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

// Query options
export interface QueryOptions extends ApiHookOptions {
  queryKey: string[];
  queryFn: () => Promise<unknown>;
  select?: (data: unknown) => unknown;
  placeholderData?: unknown;
  keepPreviousData?: boolean;
}

// Mutation options
export interface MutationOptions {
  mutationFn: (variables?: unknown) => Promise<unknown>;
  onSuccess?: (data: unknown, variables?: unknown) => void;
  onError?: (error: Error, variables?: unknown) => void;
  onSettled?: (data: unknown, error: Error | null, variables?: unknown) => void;
  retry?: boolean | number;
  retryDelay?: number;
}

// Local storage hook state
export interface StorageState<T> {
  value: T | null;
  setValue: (value: T | null) => void;
  removeValue: () => void;
  loading: boolean;
  error: Error | null;
}

// Debounce hook options
export interface DebounceOptions {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

// Throttle hook options
export interface ThrottleOptions {
  interval: number;
  leading?: boolean;
  trailing?: boolean;
}

// Intersection observer hook options
export interface IntersectionOptions {
  threshold?: number | number[];
  rootMargin?: string;
  triggerOnce?: boolean;
}

// Intersection observer state
export interface IntersectionState {
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

// Geolocation hook state
export interface GeolocationState {
  position: GeolocationPosition | null;
  error: GeolocationPositionError | null;
  loading: boolean;
}

// Geolocation hook options
export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

// Network state
export interface NetworkState {
  isOnline: boolean;
  isOffline: boolean;
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
}

// Device info state
export interface DeviceState {
  platform: 'ios' | 'android' | 'web';
  isTablet: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

// Permission state
export interface PermissionState {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
  expires: 'never' | number;
}

// Camera hook state
export interface CameraState {
  hasPermission: boolean;
  isReady: boolean;
  isRecording: boolean;
  flashMode: 'on' | 'off' | 'auto';
  cameraType: 'front' | 'back';
}

// Audio hook state
export interface AudioState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  duration: number;
  position: number;
  volume: number;
  rate: number;
}

// Keyboard hook state
export interface KeyboardState {
  isVisible: boolean;
  height: number;
  animationDuration: number;
}

// App state hook state
export interface AppState {
  state: 'active' | 'background' | 'inactive';
  isActive: boolean;
  isBackground: boolean;
  isInactive: boolean;
}

// Biometric authentication state
export interface BiometricState {
  isAvailable: boolean;
  supportedTypes: string[];
  isEnrolled: boolean;
  error: Error | null;
}

// Push notification state
export interface NotificationState {
  token: string | null;
  hasPermission: boolean;
  notification: Record<string, unknown> | null;
  error: Error | null;
}

// Deep link state
export interface DeepLinkState {
  url: string | null;
  params: Record<string, string>;
  isReady: boolean;
}

// Feature flag state
export interface FeatureFlagState {
  flags: Record<string, boolean>;
  loading: boolean;
  error: Error | null;
  isEnabled: (flag: string) => boolean;
}

// A/B test state
export interface ABTestState {
  variant: string | null;
  loading: boolean;
  error: Error | null;
}

// Analytics hook state
export interface AnalyticsState {
  isInitialized: boolean;
  userId: string | null;
  sessionId: string | null;
  error: Error | null;
}