// Type declarations for expo-router to fix missing export errors
// This is needed because TypeScript may not properly recognize expo-router types

declare module 'expo-router' {
  import { ReactNode, ComponentType } from 'react';
  import { ViewStyle, TextStyle, ImageStyle, GestureResponderEvent, View } from 'react-native';

  // Stack exports
  export function Stack(props: {
    screenOptions?: {
      headerShown?: boolean;
      headerStyle?: ViewStyle;
      headerTitleStyle?: TextStyle;
      headerTintColor?: string;
      animation?: 'slide_from_right' | 'fade' | 'none';
    };
    children?: ReactNode;
  }): ReactNode;

  // Tabs exports
  export function Tabs(props: {
    screenOptions?: {
      tabBarActiveTintColor?: string;
      tabBarInactiveTintColor?: string;
      headerShown?: boolean;
      tabBarStyle?: ViewStyle;
      tabBarLabelStyle?: TextStyle;
    };
    children?: ReactNode;
  }): ReactNode;

  // Slot export
  export function Slot(props?: { children?: ReactNode }): ReactNode;

  // Redirect export - return JSX element
  export function Redirect(props: { href: string }): JSX.Element;

  // Link export
  export function Link(props: {
    href: string;
    children?: ReactNode;
    style?: ViewStyle | TextStyle | ImageStyle;
  }): ReactNode;

  // router object export - for backward compatibility
  export const router: {
    push: (href: string) => void;
    replace: (href: string) => void;
    back: () => void;
    href: string;
  };

  // useRouter hook
export function useRouter(): {
    push: (href: string) => void;
    replace: (href: string) => void;
    back: () => void;
    href: string;
  };

  // useLocalSearchParams hook
export function useLocalSearchParams<T = Record<string, string>>(): T;

  // useGlobalSearchParams hook
export function useGlobalSearchParams<T = Record<string, string>>(): T;

  // usePathname hook
export function usePathname(): string;

  // useSegments hook
export function useSegments(): string[];

  // Tabs.Screen component - name is optional for file-based routing
export namespace Tabs {
  export function Screen(props: {
    name?: string;
    options?: {
      title?: string;
      tabBarIcon?: (props: { color: string; size: number }) => ReactNode;
      headerShown?: boolean;
    };
  }): null;
}

  // Stack.Screen component - name is optional for file-based routing
export namespace Stack {
  export function Screen(props: {
    name?: string;
    options?: {
      title?: string;
      headerShown?: boolean;
    };
  }): null;
}
}
