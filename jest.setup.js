 /* global jest */
// Jest setup file — comprehensive React Native testing infrastructure
/* eslint-disable react/display-name */

// Set a default test timeout for ALL tests. Individual tests may still
// override with jest.setTimeout() inside their own describe/it blocks,
// but anything that doesn't will have a generous 30s window.
jest.setTimeout(30000);

global.__DEV__ = true;

// Services like services/astrologer-dashboard.ts and services/chat.ts serve
// mock data ONLY when explicitly opted in for development
// (`EXPO_PUBLIC_USE_MOCK_API=true` AND `__DEV__`). Tests that exercise those
// mock paths opt in here, before any test module is imported. Tests that
// specifically verify the production-safe behavior (no fabricated data) clear
// the flag themselves.
process.env.EXPO_PUBLIC_USE_MOCK_API = 'true';

// Suppress react-test-renderer deprecation warning used by RNTL
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('react-test-renderer is deprecated')) return;
  originalConsoleError.apply(console, args);
};

// Mock AsyncStorage helpers
global.clearAsyncStorage = jest.fn();

// ============================================
// REACT NATIVE CORE MOCKS
// ============================================

const mockPlatform = { OS: 'ios', Version: '16.0' };
global.mockPlatform = mockPlatform;

jest.mock('react-native/Libraries/Utilities/Platform', () => mockPlatform);

jest.mock('react-native', () => {
  const React = require('react');
  const mockComponent = (name) => {
    const Component = (props) => React.createElement(name, props, props?.children);
    Component.displayName = name;
    return Component;
  };

  return {
    Platform: {
      get OS() { return mockPlatform.OS; },
      set OS(val) { mockPlatform.OS = val; },
      get Version() { return mockPlatform.Version; },
      set Version(val) { mockPlatform.Version = val; },
      select: jest.fn(objs => objs[mockPlatform.OS] || objs.ios),
    },
    NativeModules: {
      RNGestureHandlerModule: {
        State: { BEGAN: 'BEGAN', FAILED: 'FAILED', ACTIVE: 'ACTIVE', END: 'END', UNDETERMINED: 'UNDETERMINED' },
        attachGestureHandler: jest.fn(),
        createGestureHandler: jest.fn(),
        dropGestureHandler: jest.fn(),
        updateGestureHandler: jest.fn(),
      },
    },
    Animated: {
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        interpolate: jest.fn(),
      })),
      timing: jest.fn(() => ({
        start: jest.fn(),
      })),
      loop: jest.fn(() => ({
        start: jest.fn(),
        stop: jest.fn(),
      })),
      sequence: jest.fn(() => ({
        start: jest.fn(),
      })),
      View: mockComponent('Animated.View'),
      Text: mockComponent('Animated.Text'),
      Image: mockComponent('Animated.Image'),
      createAnimatedComponent: (comp) => comp,
    },
    // Core components
    View: mockComponent('View'),
    Text: mockComponent('Text'),
    Image: mockComponent('Image'),
    TextInput: mockComponent('TextInput'),
    ScrollView: mockComponent('ScrollView'),
    ActivityIndicator: mockComponent('ActivityIndicator'),
    FlatList: (props) => {
      const { data, renderItem, keyExtractor, ListEmptyComponent, ...rest } = props;
      const items = data?.map((item, index) => {
        const element = renderItem?.({ item, index, separators: { highlight: jest.fn(), unhighlight: jest.fn() } });
        return React.createElement(React.Fragment, { key: keyExtractor ? keyExtractor(item, index) : index }, element);
      }) || [];
      if (items.length === 0 && ListEmptyComponent) {
        items.push(React.createElement(React.Fragment, { key: 'empty' }, ListEmptyComponent));
      }
      return React.createElement('FlatList', rest, ...items);
    },
    SectionList: mockComponent('SectionList'),
    // Touchables
    TouchableOpacity: mockComponent('TouchableOpacity'),
    TouchableHighlight: mockComponent('TouchableHighlight'),
    TouchableWithoutFeedback: mockComponent('TouchableWithoutFeedback'),
    TouchableNativeFeedback: mockComponent('TouchableNativeFeedback'),
    Pressable: (props) => {
      const { onPress, disabled, onPressIn, onPressOut, ...rest } = props;
      return React.createElement(
        'Pressable',
        {
          ...rest,
          disabled,
          onPress: disabled ? undefined : onPress,
          onPressIn: disabled ? undefined : onPressIn,
          onPressOut: disabled ? undefined : onPressOut,
        },
        props?.children
      );
    },
    // Other components
    SafeAreaView: mockComponent('SafeAreaView'),
    KeyboardAvoidingView: mockComponent('KeyboardAvoidingView'),
    Modal: mockComponent('Modal'),
    Switch: mockComponent('Switch'),
    StatusBar: mockComponent('StatusBar'),
    StyleSheet: {
      create: styles => styles,
      hairlineWidth: 1,
      absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
      absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
      flatten: (style) => style,
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812, scale: 2, fontScale: 1 })),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    PixelRatio: {
      get: jest.fn(() => 2),
      getFontScale: jest.fn(() => 1),
      getPixelSizeForLayoutSize: jest.fn((size) => size * 2),
      roundToNearestPixel: jest.fn((size) => Math.round(size)),
    },
    // APIs
    Alert: {
      alert: jest.fn(),
    },
    Share: {
      share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
    },
    Keyboard: {
      dismiss: jest.fn(),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    Appearance: {
      getColorScheme: jest.fn(() => 'light'),
      addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    AccessibilityInfo: {
      isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
      isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
      isBoldTextEnabled: jest.fn(() => Promise.resolve(false)),
      isGrayscaleEnabled: jest.fn(() => Promise.resolve(false)),
      isInvertColorsEnabled: jest.fn(() => Promise.resolve(false)),
      announceForAccessibility: jest.fn(),
      setAccessibilityFocus: jest.fn(),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    Linking: {
      openURL: jest.fn(() => Promise.resolve()),
      canOpenURL: jest.fn(() => Promise.resolve(true)),
    },
    Vibration: {
      vibrate: jest.fn(),
      cancel: jest.fn(),
    },
    findNodeHandle: jest.fn(() => 123),
  };
});

// ============================================
// REACT NATIVE REANIMATED MOCKS
// ============================================

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const mockComponent = (name) => {
    const Component = (props) => React.createElement(name, props, props?.children);
    Component.displayName = `Animated.${name}`;
    return Component;
  };

  const createAnimatedComponent = jest.fn((Component) => Component);

  const reanimatedMock = {
    __esModule: true,
    default: {
      View: mockComponent('View'),
      Text: mockComponent('Text'),
      ScrollView: mockComponent('ScrollView'),
      FlatList: mockComponent('FlatList'),
      Image: mockComponent('Image'),
      createAnimatedComponent,
    },
    useAnimatedStyle: jest.fn(() => ({})),
    useSharedValue: jest.fn((value) => ({ value })),
    useDerivedValue: jest.fn((callback) => ({ value: callback() })),
    withTiming: jest.fn((value) => value),
    withSpring: jest.fn((value) => value),
    withDecay: jest.fn((value) => value),
    withSequence: jest.fn((...animations) => animations[0]),
    withDelay: jest.fn((delay, animation) => animation),
    runOnJS: jest.fn((fn) => fn),
    runOnUI: jest.fn((fn) => fn),
    interpolate: jest.fn((value, inputRange, outputRange) => {
      if (typeof value === 'number') {
        return outputRange[Math.floor(value / inputRange.length * outputRange.length)];
      }
      return outputRange[0];
    }),
    Extrapolate: {
      CLAMP: 'clamp',
      EXTEND: 'extend',
    },
    createAnimatedComponent,
    Animated: {
      View: mockComponent('View'),
      Text: mockComponent('Text'),
      ScrollView: mockComponent('ScrollView'),
      FlatList: mockComponent('FlatList'),
      Image: mockComponent('Image'),
    },
  };

  return reanimatedMock;
});

// ============================================
// EXPO MODULE MOCKS
// ============================================

const mockAsyncStorageStore = {};

const mockAsyncStorage = {
  getItem: jest.fn((key) => Promise.resolve(mockAsyncStorageStore[key] ?? null)),
  setItem: jest.fn((key, value) => {
    mockAsyncStorageStore[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    delete mockAsyncStorageStore[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(mockAsyncStorageStore).forEach(k => delete mockAsyncStorageStore[k]);
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys) => {
    keys.forEach(k => delete mockAsyncStorageStore[k]);
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockAsyncStorageStore))),
  mergeItem: jest.fn(() => Promise.resolve()),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: mockAsyncStorage,
  ...mockAsyncStorage,
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-modules-core', () => {
  // Provide a proper EventEmitter class FIRST so expo-crypto can import it
  class EventEmitter {
    constructor() { this.listeners = {}; }
    addListener(event, cb) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(cb);
      return { remove: () => {} };
    }
    addListenerOnce(event, cb) {
      const wrapped = (...args) => { this.removeListener(event, wrapped); cb(...args); };
      return this.addListener(event, wrapped);
    }
    removeListener(event, cb) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(l => l !== cb);
      }
    }
    removeAllListeners(event) {
      if (event) delete this.listeners[event];
      else this.listeners = {};
    }
    emit(event, ...args) { (this.listeners[event] || []).forEach(cb => cb(...args)); }
    listenerCount(event) { return (this.listeners[event] || []).length; }
  }

  return {
    EventEmitter,
    requireNativeModule: jest.fn(() => ({})),
    NativeModulesProxy: {},
    EventSubscription: class { remove() {} },
    CodedError: class CodedError extends Error {
      constructor(code, message) { super(message); this.code = code; }
    },
  };
});

jest.mock('expo-crypto', () => {
  const { randomFillSync, createHash } = require('crypto');
  // Import the EventEmitter we just defined in expo-modules-core mock
  const { EventEmitter } = require('expo-modules-core');
  // Build a singleton EventEmitter for the digest stream
  const digestEmitter = new EventEmitter();
  return {
    getRandomValues: jest.fn((arr) => randomFillSync(arr)),
    randomUUID: jest.fn(() => {
      const bytes = new Uint8Array(16);
      randomFillSync(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }),
    digestStringAsync: jest.fn(async (_alg, data) => createHash('sha256').update(data).digest('hex')),
    DigestEventEmitter: digestEmitter,
    CryptoDigestAlgorithm: { SHA256: 'SHA-256', SHA512: 'SHA-512', MD5: 'MD5' },
    CryptoEncoding: { HEX: 'hex', BASE64: 'base64' },
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const LinearGradient = (props) => React.createElement('LinearGradient', props, props?.children);
  LinearGradient.displayName = 'LinearGradient';
  return { LinearGradient };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const mockIcon = (name) => {
    const Icon = (props) => React.createElement(name, props);
    Icon.displayName = name;
    return Icon;
  };
  return {
    Ionicons: Object.assign(mockIcon('Ionicons'), {
      glyphMap: {
        checkmark: 1,
        'arrow-back': 2,
        'arrow-forward': 3,
        close: 4,
        menu: 5,
        search: 6,
        settings: 7,
        home: 8,
        'heart-outline': 9,
        heart: 10,
      },
    }),
    MaterialIcons: mockIcon('MaterialIcons'),
    FontAwesome: mockIcon('FontAwesome'),
    AntDesign: mockIcon('AntDesign'),
    Feather: mockIcon('Feather'),
  };
});

// Source now imports the per-icon subpath (`@expo/vector-icons/Ionicons`) to
// keep the web bundle small. That subpath bypasses the index mock above and
// would otherwise load untransformed .tsx from node_modules, so mock it too.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const Ionicons = (props) => React.createElement('Ionicons', props);
  Ionicons.displayName = 'Ionicons';
  Ionicons.glyphMap = {
    checkmark: 1,
    'arrow-back': 2,
    'arrow-forward': 3,
    close: 4,
    menu: 5,
    search: 6,
    settings: 7,
    home: 8,
    'heart-outline': 9,
    heart: 10,
  };
  return { __esModule: true, default: Ionicons };
});

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
  useSearchParams: () => ({}),
  usePathname: () => '/',
  Link: 'Link',
  Stack: { Screen: 'Screen' },
  Tabs: { Screen: 'Screen' },
}));

// ============================================
// APPLICATION SPECIFIC MOCKS
// ============================================

jest.mock('@/constants/colors', () => ({
  default: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    white: '#FFFFFF',
    black: '#000000',
    text: '#1C1C1E',
    textMuted: '#8E8E93',
    border: '#C6C6C8',
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
  },
  Colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    white: '#FFFFFF',
    black: '#000000',
    text: '#1C1C1E',
    textMuted: '#8E8E93',
    border: '#C6C6C8',
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
  },
}));

jest.mock('@/constants/theme', () => ({
  Shadows: {
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
  },
  Radii: {
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
  },
  Transitions: {
    spring: {
      damping: 15,
      stiffness: 120,
      mass: 1,
    },
    timing: {
      duration: 300,
      easing: 'ease-in-out',
    },
  },
  Gradients: {
    primary: ['#007AFF', '#5856D6'],
    purple: ['#9C27B0', '#673AB7'],
    sunset: ['#FF6B35', '#F7931E'],
    danger: ['#FF3B30', '#FF2D55'],
    gold: ['#FFD700', '#FFA500'],
  },
  Typography: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },
}));

jest.mock('@/services/logger', () => ({
  Logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    action: jest.fn(),
    navigation: jest.fn(),
  },
}));

// Validation functions are pure and don't need mocking

    // Build a fully chainable query builder via a Proxy so that arbitrary
    // .eq().eq().eq()… chains don't blow up. Every chainable method
    // returns the same builder; terminal methods (single, maybeSingle,
    // then, etc.) return a thenable Promise resolving with a default
    // empty response. Tests that need richer behavior can provide their
    // own @/lib/supabase mock at the top of the test file.
    const buildQueryBuilder = (responseData = { data: [], error: null }) => {
      const TERMINAL = new Set([
        'single', 'maybeSingle', 'then', 'catch', 'finally',
      ]);
      const CHAINABLE = [
        'select', 'insert', 'update', 'upsert', 'delete',
        'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
        'in', 'is', 'like', 'ilike', 'match', 'contains', 'containedBy',
        'or', 'and', 'not', 'filter',
        'order', 'limit', 'range', 'offset',
        'select', 'csv', 'geoNear',
        'returns', 'throwOnError', 'abortSignal',
      ];
      const makeBuilder = () => {
        const builder = {};
        for (const key of CHAINABLE) {
          builder[key] = jest.fn(() => makeBuilder());
        }
        for (const key of TERMINAL) {
          if (key === 'then') {
            builder[key] = jest.fn((resolve, reject) =>
              Promise.resolve(responseData).then(resolve, reject)
            );
          } else {
            builder[key] = jest.fn(() => Promise.resolve(responseData));
          }
        }
        return builder;
      };
      return makeBuilder();
    };

    jest.mock('@/lib/supabase', () => {
      const defaultResponse = { data: [], error: null };
      const listBuilder = buildQueryBuilder(defaultResponse);

      return {
        isSupabaseConfigured: jest.fn(() => false),
        supabase: {
          from: jest.fn(() => listBuilder),
          auth: {
            getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
            getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
            signInWithPassword: jest.fn(() => Promise.resolve({ data: null, error: null })),
            signInWithOtp: jest.fn(() => Promise.resolve({ data: null, error: null })),
            verifyOtp: jest.fn(() => Promise.resolve({ data: { session: null, user: null }, error: null })),
            signUp: jest.fn(() => Promise.resolve({ data: null, error: null })),
            signOut: jest.fn(() => Promise.resolve({ error: null })),
            onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
            updateUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
            resetPasswordForEmail: jest.fn(() => Promise.resolve({ data: null, error: null })),
            refreshSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
          },
          functions: {
            invoke: jest.fn(() => Promise.resolve({ data: null, error: null })),
          },
          storage: {
            from: jest.fn(() => ({
              upload: jest.fn(() => Promise.resolve({ data: null, error: null })),
              download: jest.fn(() => Promise.resolve({ data: null, error: null })),
              remove: jest.fn(() => Promise.resolve({ error: null })),
              getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/x' } })),
              list: jest.fn(() => Promise.resolve({ data: [], error: null })),
              createSignedUrl: jest.fn(() => Promise.resolve({ data: { signedUrl: 'https://example.com/s' }, error: null })),
            })),
          },
          channel: jest.fn(() => ({
            on: jest.fn(() => ({ subscribe: jest.fn() })),
            subscribe: jest.fn(),
            unsubscribe: jest.fn(),
          })),
          removeChannel: jest.fn(),
          rpc: jest.fn(() => Promise.resolve(defaultResponse)),
        },
      };
    });

// ============================================
// PERFORMANCE MOCKS
// ============================================

jest.mock('perf_hooks', () => ({
  performance: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    timing: {
      navigationStart: Date.now(),
    },
  },
  PerformanceObserver: jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

// ============================================
// TESTING LIBRARY HELPERS
// ============================================

// @testing-library/react-native is not mocked — use actual implementation

// ============================================
// REACT NATIVE AGORA MOCK
// ============================================

jest.mock('react-native-agora', () => ({
  createAgoraRtcEngine: jest.fn(() => ({
    initialize: jest.fn(() => Promise.resolve()),
    enableAudio: jest.fn(() => Promise.resolve()),
    enableVideo: jest.fn(() => Promise.resolve()),
    joinChannel: jest.fn(() => Promise.resolve()),
    leaveChannel: jest.fn(() => Promise.resolve()),
    muteLocalAudioStream: jest.fn(() => Promise.resolve()),
    setEnableSpeakerphone: jest.fn(() => Promise.resolve()),
    muteLocalVideoStream: jest.fn(() => Promise.resolve()),
    switchCamera: jest.fn(() => Promise.resolve()),
    release: jest.fn(() => Promise.resolve()),
    registerEventHandler: jest.fn(() => Promise.resolve()),
  })),
  ChannelProfileType: {
    ChannelProfileCommunication: 0,
  },
  ClientRoleType: {
    ClientRoleBroadcaster: 1,
    ClientRoleAudience: 2,
  },
}));

// ============================================
// DETOX MOCK
// ============================================

jest.mock('detox', () => ({
  device: {
    launchApp: jest.fn(),
    terminateApp: jest.fn(),
    reloadReactNative: jest.fn(),
    takeScreenshot: jest.fn(() => Promise.resolve('mock-screenshot-path')),
    setStatusBar: jest.fn(() => Promise.resolve()),
    openURL: jest.fn(() => Promise.resolve()),
  },
  expect: (element) => ({
    toBeVisible: jest.fn(() => Promise.resolve()),
    toExist: jest.fn(() => Promise.resolve()),
    toHaveText: jest.fn(() => Promise.resolve()),
    toHaveLabel: jest.fn(() => Promise.resolve()),
    not: {
      toBeVisible: jest.fn(() => Promise.resolve()),
      toExist: jest.fn(() => Promise.resolve()),
    },
  }),
  element: jest.fn(() => ({
    tap: jest.fn(() => Promise.resolve()),
    typeText: jest.fn(() => Promise.resolve()),
    clearText: jest.fn(() => Promise.resolve()),
    replaceText: jest.fn(() => Promise.resolve()),
    swipe: jest.fn(() => Promise.resolve()),
    scroll: jest.fn(() => Promise.resolve()),
    atIndex: jest.fn(() => ({
      tap: jest.fn(() => Promise.resolve()),
    })),
  })),
  by: {
    id: jest.fn(() => 'by.id'),
    text: jest.fn(() => 'by.text'),
    label: jest.fn(() => 'by.label'),
    type: jest.fn(() => 'by.type'),
    traits: jest.fn(() => 'by.traits'),
  },
  waitFor: jest.fn((elem) => ({
    toBeVisible: jest.fn(() => ({
      withTimeout: jest.fn(() => Promise.resolve()),
    })),
    toExist: jest.fn(() => ({
      withTimeout: jest.fn(() => Promise.resolve()),
    })),
    not: {
      toBeVisible: jest.fn(() => ({
        withTimeout: jest.fn(() => Promise.resolve()),
      })),
      toExist: jest.fn(() => ({
        withTimeout: jest.fn(() => Promise.resolve()),
      })),
    },
    withTimeout: jest.fn(() => Promise.resolve()),
    whileElement: jest.fn(() => Promise.resolve()),
  })),
}), { virtual: true });

// ============================================
// ENVIRONMENT VARIABLES FOR TESTS
// ============================================

process.env.EXPO_PUBLIC_AGORA_APP_ID = 'test-agora-app-id';

// ============================================
// GLOBAL TEST HELPERS
// ============================================

// Helper to mock navigation
global.mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  dispatch: jest.fn(),
};

// Helper to mock dimensions
global.mockDimensions = {
  window: { width: 375, height: 667 },
  screen: { width: 375, height: 667 },
};

// Helper to create mock components
global.createMockComponent = (name) => {
  const React = require('react');
  const Component = (props) => React.createElement(name, props, props.children);
  Component.displayName = name;
  return Component;
};

// Helper for async tests
global.flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Note: asyncStorageStore is cleared per-test in individual test beforeEach hooks

// ============================================
// REACT NATIVE SAFE AREA CONTEXT MOCK
// ============================================

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const mockComponent = (name) => {
    const Component = (props) => React.createElement(name, props, props?.children);
    Component.displayName = name;
    return Component;
  };
  
  return {
    SafeAreaView: mockComponent('SafeAreaView'),
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaInsetsContext: {
      Consumer: ({ children }) => children({ top: 0, bottom: 0, left: 0, right: 0 }),
    },
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    initialWindowMetrics: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
  };
});

// ============================================
// LUCIDE ICONS MOCK
// ============================================

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const mockIcon = (name) => {
    const Icon = (props) => React.createElement(name, props);
    Icon.displayName = name;
    return Icon;
  };
  return {
    FileText: mockIcon('FileText'),
    MessageCircle: mockIcon('MessageCircle'),
    ShoppingBag: mockIcon('ShoppingBag'),
    Bell: mockIcon('Bell'),
    Calendar: mockIcon('Calendar'),
    Star: mockIcon('Star'),
    Search: mockIcon('Search'),
    Plus: mockIcon('Plus'),
    AlertCircle: mockIcon('AlertCircle'),
    WifiOff: mockIcon('WifiOff'),
    AlertTriangle: mockIcon('AlertTriangle'),
    RefreshCw: mockIcon('RefreshCw'),
    Home: mockIcon('Home'),
    Bug: mockIcon('Bug'),
    Lightbulb: mockIcon('Lightbulb'),
    Send: mockIcon('Send'),
    Shield: mockIcon('Shield'),
    ArrowLeft: mockIcon('ArrowLeft'),
    ArrowRight: mockIcon('ArrowRight'),
    DollarSign: mockIcon('DollarSign'),
    Clock: mockIcon('Clock'),
    Users: mockIcon('Users'),
    TrendingUp: mockIcon('TrendingUp'),
    BarChart3: mockIcon('BarChart3'),
    Phone: mockIcon('Phone'),
    Video: mockIcon('Video'),
    CreditCard: mockIcon('CreditCard'),
    User: mockIcon('User'),
    UploadCloud: mockIcon('UploadCloud'),
    ChevronRight: mockIcon('ChevronRight'),
    ShieldCheck: mockIcon('ShieldCheck'),
    CheckCircle: mockIcon('CheckCircle'),
    XCircle: mockIcon('XCircle'),
    Filter: mockIcon('Filter'),
    Heart: mockIcon('Heart'),
    Settings: mockIcon('Settings'),
    LogOut: mockIcon('LogOut'),
    HelpCircle: mockIcon('HelpCircle'),
    Wallet: mockIcon('Wallet'),
  };
});

// ============================================
// EXPO NOTIFICATIONS MOCK
// ============================================

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(() => Promise.resolve(null)),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'mock-token' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('mock-id')),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
}));

// ============================================
// EXPO CONSTANTS MOCK
// ============================================

jest.mock('expo-constants', () => ({
  manifest: {
    hostUri: 'localhost:8081',
    extra: {
      sentryDsn: 'https://mock@sentry.io/12345',
    },
  },
  manifest2: {
    extra: {
      sentryDsn: 'https://mock@sentry.io/12345',
    },
  },
  expoConfig: {
    extra: {
      sentryDsn: 'https://mock@sentry.io/12345',
    },
  },
  manifestUrl: 'https://exp.host/@mock/app',
  absoluteUrl: 'http://localhost:8081',
  appOwnership: 'expo',
  isDetached: false,
  nativeAppVersion: '1.0.0',
  nativeBuildVersion: '1',
}));

// ============================================
// SENTRY MOCK
// ============================================

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureMessage: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  clearContext: jest.fn(),
  withScope: jest.fn((callback) => callback({ setTag: jest.fn(), setExtra: jest.fn() })),
  startTransaction: jest.fn(() => ({
    finish: jest.fn(),
    startChild: jest.fn(() => ({
      finish: jest.fn(),
    })),
  })),
  configureScope: jest.fn((callback) => callback({ setTag: jest.fn(), setExtra: jest.fn(), setUser: jest.fn() })),
  ReactNativeTracing: {
    tracingInstrumentation: jest.fn(),
  },
  ReactNavigationInstrumentation: jest.fn(),
}));