import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  User as UserIcon, Wallet, ChevronRight, Calendar,
  Bell, FileText, Settings, LogOut, ShoppingBag,
  MessageCircle, Heart, Shield, HelpCircle
} from 'lucide-react-native';
import { useAppTheme, AppTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useApp } from '@/contexts/AppContext';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

function ProfileTabInner() {
  const Colors = useAppTheme();
  const { t } = useLanguage();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  const { user, isLoggedIn, logout, savedKundlis } = useUser();
  const { walletBalance } = useApp();

  const handleLogout = async () => {
    Alert.alert(
      t('common.logout'),
      t('profile.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.logout'), 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          }
        }
      ]
    );
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.notLoggedIn}>
          <UserIcon size={64} color={Colors.primary} />
          <Text style={styles.notLoggedInTitle}>{t('profile.welcome')}</Text>
          <Text style={styles.notLoggedInText}>
            {t('profile.loginPrompt')}
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>{t('common.login')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const menuItems = [
    {
      section: t('profile.account'),
      items: [
        { icon: Wallet, label: t('profile.wallet'), value: `₹${walletBalance}`, route: '/wallet' },
        { icon: ShoppingBag, label: t('profile.orders'), route: '/orders' },
        { icon: Calendar, label: t('profile.consultations'), route: '/consultations' },
        { icon: FileText, label: t('profile.kundlis'), value: savedKundlis.length.toString(), route: '/kundli-matching' },
      ]
    },
    {
      section: t('profile.saved'),
      items: [
        { icon: Heart, label: t('profile.favorites'), route: '/astrologers' },
        { icon: MessageCircle, label: t('profile.chatHistory'), route: '/chat-history' },
      ]
    },
    {
      section: t('profile.support'),
      items: [
        { icon: HelpCircle, label: t('profile.help'), route: '/help' },
        { icon: Shield, label: t('profile.privacy'), route: '/security' },
        { icon: Bell, label: t('profile.notifications'), route: '/reminders' },
      ]
    },
    {
      section: t('profile.app'),
      items: [
        { icon: Settings, label: t('profile.settings'), route: '/settings' },
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.profileCard}
            onPress={() => router.push('/profile')}
          >
            <View style={styles.avatarContainer}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <UserIcon size={32} color={Colors.white} />
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user?.name || t('common.user')}</Text>
              <Text style={styles.userPhone}>{user?.phone || ''}</Text>
            </View>
            <ChevronRight size={20} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Wallet Card */}
        <TouchableOpacity 
          style={styles.walletCard}
          onPress={() => router.push('/wallet')}
        >
          <View style={styles.walletLeft}>
            <View style={styles.walletIconContainer}>
              <Wallet size={24} color={Colors.white} />
            </View>
            <View>
              <Text style={styles.walletLabel}>{t('profile.wallet')}</Text>
              <Text style={styles.walletBalance}>₹{walletBalance}</Text>
            </View>
          </View>
          <View style={styles.addMoneyButton}>
            <Text style={styles.addMoneyText}>{t('wallet.addMoney')}</Text>
          </View>
        </TouchableOpacity>

        {/* Menu Sections */}
        {menuItems.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.menuItem,
                    itemIndex < section.items.length - 1 && styles.menuItemBorder
                  ]}
                  onPress={() => router.push(item.route)}
                >
                  <View style={styles.menuIconContainer}>
                    <item.icon size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.value && (
                    <Text style={styles.menuValue}>{item.value}</Text>
                  )}
                  <ChevronRight size={18} color={Colors.textLight} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color={Colors.error} />
          <Text style={styles.logoutText}>{t('common.logout')}</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>AstroNemi v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  notLoggedIn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notLoggedInTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  notLoggedInText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  userPhone: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 2,
  },
  zodiacBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  zodiacText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  walletBalance: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
  },
  addMoneyButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addMoneyText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  menuSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  menuValue: {
    fontSize: 14,
    color: Colors.textLight,
    marginRight: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  logoutText: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    color: Colors.textLight,
    fontSize: 12,
    marginBottom: 20,
  },
});

export default function ProfileTab() {
  return (
    <FeatureErrorBoundary featureName="Profile">
      <ProfileTabInner />
    </FeatureErrorBoundary>
  );
}
