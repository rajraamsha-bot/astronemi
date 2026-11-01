import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  User as UserIcon, Calendar, Clock, Star, ChevronRight, 
  Bell, CreditCard, Gift, Users, FileText, Settings, LogOut, Plus, Trash2, Edit, ArrowLeft
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';
import { SavedKundli } from '@/types/user';
import { Logger } from '@/services/logger';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProfileScreen() {
  const { user, isLoggedIn, logout, updateProfile, savedKundlis, removeSavedKundli, notificationSettings, updateNotificationSettings } = useUser();
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const handleSave = async () => {
    try {
      await updateProfile({ name, email, phone });
      setEditing(false);
      Alert.alert(t('common.success'), t('profile.updateSuccess'));
    } catch (error) {
      Alert.alert(t('common.error'), t('profile.updateError'));
      Logger.error('Profile update error', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      t('profile.logout'),
      t('profile.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('profile.logout'), 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          }
        }
      ]
    );
  };

  const handleDeleteKundli = (kundli: SavedKundli) => {
    Alert.alert(
      t('profile.deleteKundli'),
      t('profile.deleteKundliConfirm', { name: kundli.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.delete'), 
          style: 'destructive',
          onPress: () => removeSavedKundli(kundli.id)
        }
      ]
    );
  };

  if (!isLoggedIn) {
    return (
      <>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft color={Colors.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('profile.title')}</Text>
            <View style={styles.backButton} />
          </View>
          
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
              <Text style={styles.loginButtonText}>{t('auth.loginSignUp')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft color={Colors.text} size={24} />
          </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('profile.myProfile')}</Text>
          <View style={styles.backButton} />
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <UserIcon size={40} color={Colors.white} />
                </View>
              )}
              <TouchableOpacity style={styles.editAvatar}>
                <Edit size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>
            
            {editing ? (
              <View style={styles.editForm}>
                <TextInput
                  style={styles.editInput}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('profile.name')}
                  placeholderTextColor={Colors.textLight}
                />
                <TextInput
                  style={styles.editInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('profile.email')}
                  placeholderTextColor={Colors.textLight}
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.editInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t('profile.phone')}
                  placeholderTextColor={Colors.textLight}
                  keyboardType="phone-pad"
                />
                <View style={styles.editButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setEditing(false)}
                  >
                    <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={handleSave}
                  >
                    <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{user?.name}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
                {user?.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
                <TouchableOpacity 
                  style={styles.editProfileButton}
                  onPress={() => setEditing(true)}
                >
                  <Edit size={16} color={Colors.primary} />
                  <Text style={styles.editProfileText}>{t('profile.editProfile')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Referral Section */}
          <View style={styles.referralCard}>
            <Gift size={24} color={Colors.white} />
            <View style={styles.referralInfo}>
              <Text style={styles.referralTitle}>{t('referral.title')}</Text>
              <Text style={styles.referralText}>{t('referral.shareAndEarn')}</Text>
            </View>
            <View style={styles.referralCodeContainer}>
              <Text style={styles.referralCode}>{user?.referralCode}</Text>
            </View>
          </View>

          {/* Saved Kundlis */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('profile.savedKundlis')}</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => router.push('/kundli')}
              >
                <Plus size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            
            {savedKundlis.length === 0 ? (
              <View style={styles.emptyState}>
                <FileText size={40} color={Colors.textLight} />
                <Text style={styles.emptyText}>{t('profile.noSavedKundlis')}</Text>
                <Text style={styles.emptySubtext}>{t('profile.noSavedKundlisDesc')}</Text>
              </View>
            ) : (
              <View style={styles.kundliList}>
                {savedKundlis.map((kundli) => (
                  <TouchableOpacity 
                    key={kundli.id} 
                    style={styles.kundliCard}
                    onPress={() => router.push(`/kundli-view/${kundli.id}`)}
                  >
                    <View style={styles.kundliInfo}>
                      <Text style={styles.kundliName}>{kundli.name}</Text>
                      <Text style={styles.kundliRelation}>{kundli.relation}</Text>
                      <Text style={styles.kundliDetails}>
                        {kundli.birthDetails.birthDate} | {kundli.birthDetails.birthPlace}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteKundli(kundli)}
                    >
                      <Trash2 size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Notification Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.notifications')}</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Bell size={20} color={Colors.primary} />
                <Text style={styles.settingLabel}>{t('profile.dailyHoroscope')}</Text>
              </View>
              <Switch
                value={notificationSettings.dailyHoroscope}
                onValueChange={(value) => updateNotificationSettings({ dailyHoroscope: value })}
                trackColor={{ false: Colors.border, true: Colors.primary }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Calendar size={20} color={Colors.gold} />
                <Text style={styles.settingLabel}>{t('profile.festivalReminders')}</Text>
              </View>
              <Switch
                value={notificationSettings.festivalReminders}
                onValueChange={(value) => updateNotificationSettings({ festivalReminders: value })}
                trackColor={{ false: Colors.border, true: Colors.primary }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Clock size={20} color={Colors.success} />
                <Text style={styles.settingLabel}>{t('profile.muhuratAlerts')}</Text>
              </View>
              <Switch
                value={notificationSettings.muhuratAlerts}
                onValueChange={(value) => updateNotificationSettings({ muhuratAlerts: value })}
                trackColor={{ false: Colors.border, true: Colors.primary }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Star size={20} color={Colors.purple} />
                <Text style={styles.settingLabel}>{t('profile.transitAlerts')}</Text>
              </View>
              <Switch
                value={notificationSettings.transitAlerts}
                onValueChange={(value) => updateNotificationSettings({ transitAlerts: value })}
                trackColor={{ false: Colors.border, true: Colors.primary }}
              />
            </View>
          </View>

          {/* Quick Links */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.account')}</Text>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/subscription')}
            >
              <CreditCard size={20} color={Colors.primary} />
              <Text style={styles.menuItemText}>{t('subscription.title')}</Text>
              <ChevronRight size={20} color={Colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/referral')}
            >
              <Users size={20} color={Colors.success} />
              <Text style={styles.menuItemText}>{t('profile.referralProgram')}</Text>
              <ChevronRight size={20} color={Colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/astrologer-console')}
            >
              <Star size={20} color={Colors.gold} />
              <Text style={styles.menuItemText}>{t('profile.astrologerConsole')}</Text>
              <ChevronRight size={20} color={Colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/settings')}
            >
              <Settings size={20} color={Colors.textLight} />
              <Text style={styles.menuItemText}>{t('profile.settings')}</Text>
              <ChevronRight size={20} color={Colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, styles.logoutItem]}
              onPress={handleLogout}
            >
              <LogOut size={20} color={Colors.error} />
              <Text style={[styles.menuItemText, { color: Colors.error }]}>{t('profile.logout')}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  notLoggedIn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  notLoggedInTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 20,
  },
  notLoggedInText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  profileHeader: {
    backgroundColor: Colors.primary,
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatar: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    padding: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 4,
  },
  userPhone: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  editForm: {
    width: '100%',
    marginTop: 16,
  },
  editInput: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.white,
    marginBottom: 12,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.purple,
    margin: 20,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  referralInfo: {
    flex: 1,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  referralText: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  referralCodeContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  referralCode: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: Colors.white,
    padding: 8,
    borderRadius: 8,
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
  },
  kundliList: {
    gap: 12,
  },
  kundliCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  kundliInfo: {
    flex: 1,
  },
  kundliName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  kundliRelation: {
    fontSize: 13,
    color: Colors.primary,
    marginTop: 2,
  },
  kundliDetails: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    color: Colors.text,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  logoutItem: {
    marginTop: 8,
  },
});
