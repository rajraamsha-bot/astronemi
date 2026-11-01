import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from '@expo/vector-icons/Ionicons';
import { Home, Users, Star, FileText, User } from 'lucide-react-native';

import { useAppTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const Colors = useAppTheme();
  const { t } = useLanguage();
  
  // Icon component that works on both web and native
  const TabIcon = ({ name, color, size }: { name: string; color: string; size: number }) => {
    if (Platform.OS === 'web') {
      // Use Ionicons for web
      const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
        home: 'home',
        astrologers: 'people',
        horoscope: 'star',
        kundli: 'document-text',
        profile: 'person',
      };
      return <Ionicons name={iconMap[name]} size={size} color={color} />;
    } else {
      // Use Lucide icons for native
      const iconMap: Record<string, React.ReactNode> = {
        home: <Home color={color} size={size} />,
        astrologers: <Users color={color} size={size} />,
        horoscope: <Star color={color} size={size} />,
        kundli: <FileText color={color} size={size} />,
        profile: <User color={color} size={size} />,
      };
      return iconMap[name];
    }
  };
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tabIconSelected,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.home'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <TabIcon name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="astrologers"
        options={{
          title: t('nav.astrologers'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <TabIcon name="astrologers" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="horoscope"
        options={{
          title: t('nav.horoscope'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <TabIcon name="horoscope" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="kundli"
        options={{
          title: t('nav.kundli'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <TabIcon name="kundli" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <TabIcon name="profile" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}