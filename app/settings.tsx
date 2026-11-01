import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Moon, Globe, Shield, HelpCircle, FileText,
  LogOut, ChevronRight, Smartphone, Database, Info, Trash2, Sun, Download,
} from 'lucide-react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, LANGUAGES, LanguageCode } from '@/contexts/LanguageContext';
import { accountService } from '@/services/account-management';
import { errorReporting } from '@/services/error-reporting';
import { Logger } from '@/services/logger';

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme, themeMode, setThemeMode } = useTheme();
  const { logout, user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [showLanguageModal, setShowLanguageModal] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const s = createStyles(theme as any);

  const handleClearCache = async () => {
    Alert.alert(
      t('settings.clearCache'),
      t('settings.confirmClearCache'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Get keys to preserve (user data, preferences)
              const preservedKeys = ['@user', '@theme', '@language', '@kundlis'];
              const allKeys = await AsyncStorage.getAllKeys();
              const keysToRemove = allKeys.filter(key => !preservedKeys.includes(key));
              
              if (keysToRemove.length > 0) {
                await AsyncStorage.multiRemove(keysToRemove);
              }
              
              Alert.alert(`✅ ${t('common.success')}`, t('settings.cacheCleared'));
            } catch (error) {
              Logger.error('Cache clear error', error);
              Alert.alert(t('common.error'), t('common.unableToLoad'));
            }
          }
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      t('settings.deleteAccount'),
      t('settings.confirmDeleteAccount'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Export Data First',
          onPress: handleExportData,
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            setDeleting(true);
            try {
              const result = await accountService.deleteAccount(user.id);
              if (result.success) {
                await logout();
                router.replace('/login');
              } else {
                Alert.alert(t('common.error'), result.error || t('common.unableToLoad'));
              }
            } catch (error) {
              errorReporting.captureException(error as Error, { tags: { operation: 'delete_account' } });
              Alert.alert(t('common.error'), t('common.unableToLoad'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    if (!user?.id) return;
    setExporting(true);
    try {
      const data = await accountService.exportUserData(user.id);
      if (data) {
        // SECURITY FIX: Create and download actual JSON file instead of just showing alert
        const exportData = {
          exportDate: new Date().toISOString(),
          userId: user.id,
          data,
        };
        
        const jsonString = JSON.stringify(exportData, null, 2);
        const fileName = `AstroNemi_Export_${user.id.slice(0, 8)}_${Date.now()}.json`;
        
        // Use expo-file-system and expo-sharing to create and share the file
        const { documentDirectory, writeAsStringAsync } = await import('expo-file-system');
        const { shareAsync, isAvailableAsync } = await import('expo-sharing');
        
        const filePath = `${documentDirectory}${fileName}`;
        await writeAsStringAsync(filePath, jsonString);
        
        if (await isAvailableAsync()) {
          await shareAsync(filePath);
          Alert.alert(
            t('settings.exportData'),
            `Your data has been exported and saved.\n\nFile: ${fileName}\n\n• Profile: ${data.profile ? 'Yes' : 'No'}\n• Kundlis: ${data.kundlis.length}\n• Consultations: ${data.consultations.length}\n• Chat Messages: ${data.chatMessages.length}\n• Wallet Transactions: ${data.walletTransactions.length}\n• Orders: ${data.orders.length}`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            t('settings.exportData'),
            `Export file created at:\n${filePath}\n\nSharing not available on this device.`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(t('common.error'), 'Failed to export data. Please try again.');
      }
    } catch (error) {
      errorReporting.captureException(error as Error, { tags: { operation: 'export_data' } });
      Alert.alert(t('common.error'), t('common.unableToLoad'));
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
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
        },
      ]
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={() => router.back()}>
          <ArrowLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('settings.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>

        {/* Appearance */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('settings.appearance')}</Text>

          <View style={s.settingItem}>
            <View style={s.settingLeft}>
              {isDark ? <Moon size={20} color={theme.primary} /> : <Sun size={20} color={theme.warning} />}
              <View>
                <Text style={s.settingLabel}>{t('settings.darkMode')}</Text>
                <Text style={s.settingSubLabel}>{isDark ? 'Dark theme active' : 'Light theme active'}</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#E0E0E0', true: theme.primary + '80' }}
              thumbColor={isDark ? theme.primary : '#F5F5F5'}
            />
          </View>

          <TouchableOpacity style={s.settingItem} onPress={() => setThemeMode('system')}>
            <View style={s.settingLeft}>
              <Smartphone size={20} color={theme.text} />
              <Text style={s.settingLabel}>{t('settings.followSystem')}</Text>
            </View>
            <View style={s.settingRight}>
              {themeMode === 'system' && (
                <View style={s.activeBadge}><Text style={s.activeBadgeText}>Active</Text></View>
              )}
              <ChevronRight size={20} color={theme.textLight} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Language */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('settings.language')}</Text>
          <TouchableOpacity style={s.settingItem} onPress={() => setShowLanguageModal(true)}>
            <View style={s.settingLeft}>
              <Globe size={20} color={theme.text} />
              <Text style={s.settingLabel}>{t('settings.appLanguage')}</Text>
            </View>
            <View style={s.settingRight}>
              <Text style={s.settingValue}>{LANGUAGES[language]}</Text>
              <ChevronRight size={20} color={theme.textLight} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Language Selection Modal */}
        <Modal
          visible={showLanguageModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <TouchableOpacity 
            style={s.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowLanguageModal(false)}
          >
            <View style={s.modalContainer}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{t('settings.selectLanguage')}</Text>
                <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                  <Trash2 size={20} color={theme.textLight} />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {(Object.keys(LANGUAGES) as LanguageCode[]).map((langCode) => (
                  <TouchableOpacity
                    key={langCode}
                    style={[
                      s.langItem,
                      language === langCode && s.langItemActive
                    ]}
                    onPress={() => {
                      setLanguage(langCode);
                      setShowLanguageModal(false);
                    }}
                  >
                    <Text style={[
                      s.langLabel,
                      language === langCode && s.langLabelActive
                    ]}>
                      {LANGUAGES[langCode]}
                    </Text>
                    {language === langCode && <View style={s.activeDot} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Privacy & Security */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('settings.privacy')}</Text>
          <TouchableOpacity style={s.settingItem} onPress={() => router.push('/privacy-policy')}>
            <View style={s.settingLeft}>
              <Shield size={20} color={theme.text} />
              <Text style={s.settingLabel}>{t('settings.privacyPolicy')}</Text>
            </View>
            <ChevronRight size={20} color={theme.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={s.settingItem} onPress={() => router.push('/terms')}>
            <View style={s.settingLeft}>
              <FileText size={20} color={theme.text} />
              <Text style={s.settingLabel}>{t('settings.terms')}</Text>
            </View>
            <ChevronRight size={20} color={theme.textLight} />
          </TouchableOpacity>
        </View>

        {/* Support */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('settings.support')}</Text>
          <TouchableOpacity style={s.settingItem} onPress={() => router.push('/help')}>
            <View style={s.settingLeft}>
              <HelpCircle size={20} color={theme.text} />
              <Text style={s.settingLabel}>{t('settings.help')}</Text>
            </View>
            <ChevronRight size={20} color={theme.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={s.settingItem} onPress={() => router.push('/about')}>
            <View style={s.settingLeft}>
              <Info size={20} color={theme.text} />
              <Text style={s.settingLabel}>{t('settings.about')}</Text>
            </View>
            <ChevronRight size={20} color={theme.textLight} />
          </TouchableOpacity>
        </View>

        {/* Data */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('settings.data')}</Text>
          <TouchableOpacity style={s.settingItem} onPress={handleExportData} disabled={exporting}>
            <View style={s.settingLeft}>
              <Download size={20} color={theme.text} />
              <Text style={s.settingLabel}>{t('settings.exportData')}</Text>
            </View>
            {exporting ? <ActivityIndicator size="small" color={theme.primary} /> : <ChevronRight size={20} color={theme.textLight} />}
          </TouchableOpacity>
          <TouchableOpacity style={s.settingItem} onPress={handleClearCache}>
            <View style={s.settingLeft}>
              <Database size={20} color={theme.text} />
              <Text style={s.settingLabel}>{t('settings.clearCache')}</Text>
            </View>
            <ChevronRight size={20} color={theme.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={s.settingItem} onPress={handleDeleteAccount} disabled={deleting}>
            <View style={s.settingLeft}>
              <Trash2 size={20} color={theme.error} />
              <Text style={[s.settingLabel, { color: theme.error }]}>{t('settings.deleteAccount')}</Text>
            </View>
            {deleting ? <ActivityIndicator size="small" color={theme.error} /> : <ChevronRight size={20} color={theme.textLight} />}
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color={theme.error} />
          <Text style={s.logoutText}>{t('common.logout')}</Text>
        </TouchableOpacity>

        <Text style={s.versionText}>AstroNemi v1.0.0 • Made with ✨ in India</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: theme.white, borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    backButton: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
    content: { flex: 1 },
    section: {
      backgroundColor: theme.white, marginHorizontal: 16, marginTop: 16,
      borderRadius: 16, overflow: 'hidden',
    },
    sectionTitle: {
      fontSize: 12, fontWeight: '700', color: theme.textLight,
      paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
      textTransform: 'uppercase', letterSpacing: 0.8,
    },
    settingItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    settingLabel: { fontSize: 15, color: theme.text },
    settingSubLabel: { fontSize: 12, color: theme.textLight, marginTop: 1 },
    settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    settingValue: { fontSize: 14, color: theme.textLight },
    activeBadge: {
      backgroundColor: theme.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
    },
    activeBadgeText: { fontSize: 11, fontWeight: '600', color: theme.primary },
    logoutButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.white, marginHorizontal: 16, marginTop: 24,
      paddingVertical: 16, borderRadius: 16, gap: 8,
    },
    logoutText: { fontSize: 16, fontWeight: '600', color: theme.error },
    versionText: { fontSize: 12, color: theme.textLight, textAlign: 'center', marginTop: 16 },
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
    },
    modalContainer: {
      width: '85%', backgroundColor: theme.white, borderRadius: 20, maxHeight: '70%', overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
    langItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    langItemActive: { backgroundColor: theme.primary + '10' },
    langLabel: { fontSize: 16, color: theme.text },
    langLabelActive: { color: theme.primary, fontWeight: '600' },
    activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary },
  });
}
