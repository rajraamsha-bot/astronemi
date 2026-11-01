import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, TextInput, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft, MessageCircle, Phone, Video,
} from 'lucide-react-native';
import { astrologerDashboard } from '@/services/astrologer-dashboard';
import { Logger } from '@/services/logger';
import type { AstrologerProfile } from '@/types/astrologer-dashboard';

export default function AstrologerProfileScreen() {
  const [profile, setProfile] = useState<AstrologerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // A failed load previously left `loading=false, profile=null` — the screen
  // rendered its spinner branch FOREVER (loading || !profile). Track the
  // failure and show a retry state instead.
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [bio, setBio] = useState('');
  const [chatPrice, setChatPrice] = useState('');
  const [voicePrice, setVoicePrice] = useState('');
  const [videoPrice, setVideoPrice] = useState('');
  const [availChat, setAvailChat] = useState(true);
  const [availVoice, setAvailVoice] = useState(true);
  const [availVideo, setAvailVideo] = useState(true);

  const load = useCallback(async () => {
    try {
      const p = await astrologerDashboard.getProfile();
      setLoadFailed(false);
      setProfile(p);
      setBio(p.bio || '');
      setChatPrice(String(p.pricePerMinuteChat || ''));
      setVoicePrice(String(p.pricePerMinuteVoice || ''));
      setVideoPrice(String(p.pricePerMinuteVideo || ''));
      setAvailChat(p.isAvailableForChat);
      setAvailVoice(p.isAvailableForVoice);
      setAvailVideo(p.isAvailableForVideo);
    } catch (e) {
      Logger.error('Failed to load profile', e);
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleSave = async () => {
    const chat = parseFloat(chatPrice);
    const voice = parseFloat(voicePrice);
    const video = parseFloat(videoPrice);

    if ((chatPrice !== '' && (isNaN(chat) || chat < 0)) ||
        (voicePrice !== '' && (isNaN(voice) || voice < 0)) ||
        (videoPrice !== '' && (isNaN(video) || video < 0))) {
      Alert.alert('Invalid price', 'Prices must be positive numbers.');
      return;
    }

    setSaving(true);
    const result = await astrologerDashboard.updateProfile({
      bio,
      pricePerMinuteChat: isNaN(chat) ? undefined : chat,
      pricePerMinuteVoice: isNaN(voice) ? undefined : voice,
      pricePerMinuteVideo: isNaN(video) ? undefined : video,
      isAvailableForChat: availChat,
      isAvailableForVoice: availVoice,
      isAvailableForVideo: availVideo,
    });
    setSaving(false);

    if (result.success) {
      Alert.alert('Saved', 'Your profile has been updated.');
    } else {
      Alert.alert('Error', result.error || 'Failed to update profile');
    }
  };

  if (loading || !profile) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        {loadFailed && !loading ? (
          <>
            <Text style={{ fontSize: 15, color: '#6B7280', marginBottom: 12, textAlign: 'center' }}>
              Could not load your profile. Check your connection and try again.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#6B46C1', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 }}
              onPress={() => { setLoading(true); load(); }}
            >
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Retry</Text>
            </TouchableOpacity>
          </>
        ) : (
          <ActivityIndicator size="large" color="#6B46C1" />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#6B46C1" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <TextInput
            style={styles.bioInput}
            multiline
            numberOfLines={4}
            placeholder="Tell clients about your expertise..."
            placeholderTextColor="#9CA3AF"
            value={bio}
            onChangeText={setBio}
            maxLength={500}
          />
          <Text style={styles.charCount}>{bio.length}/500</Text>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing (₹/min)</Text>

          <View style={styles.priceRow}>
            <MessageCircle size={18} color="#6B46C1" />
            <Text style={styles.priceLabel}>Chat</Text>
            <TextInput
              style={styles.priceInput}
              keyboardType="numeric"
              placeholder="25"
              placeholderTextColor="#9CA3AF"
              value={chatPrice}
              onChangeText={setChatPrice}
            />
            <Text style={styles.priceUnit}>₹/min</Text>
          </View>

          <View style={styles.priceRow}>
            <Phone size={18} color="#22C55E" />
            <Text style={styles.priceLabel}>Voice</Text>
            <TextInput
              style={styles.priceInput}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor="#9CA3AF"
              value={voicePrice}
              onChangeText={setVoicePrice}
            />
            <Text style={styles.priceUnit}>₹/min</Text>
          </View>

          <View style={styles.priceRow}>
            <Video size={18} color="#F59E0B" />
            <Text style={styles.priceLabel}>Video</Text>
            <TextInput
              style={styles.priceInput}
              keyboardType="numeric"
              placeholder="35"
              placeholderTextColor="#9CA3AF"
              value={videoPrice}
              onChangeText={setVideoPrice}
            />
            <Text style={styles.priceUnit}>₹/min</Text>
          </View>
        </View>

        {/* Availability toggles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <MessageCircle size={18} color="#6B46C1" />
              <Text style={styles.toggleLabel}>Accept Chat</Text>
            </View>
            <Switch
              value={availChat}
              onValueChange={setAvailChat}
              trackColor={{ false: '#E5E5EA', true: '#6B46C1' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Phone size={18} color="#22C55E" />
              <Text style={styles.toggleLabel}>Accept Voice</Text>
            </View>
            <Switch
              value={availVoice}
              onValueChange={setAvailVoice}
              trackColor={{ false: '#E5E5EA', true: '#22C55E' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Video size={18} color="#F59E0B" />
              <Text style={styles.toggleLabel}>Accept Video</Text>
            </View>
            <Switch
              value={availVideo}
              onValueChange={setAvailVideo}
              trackColor={{ false: '#E5E5EA', true: '#F59E0B' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4FF' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E5EA',
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  saveButton: { paddingHorizontal: 14, paddingVertical: 6 },
  saveButtonText: { fontSize: 15, fontWeight: '700', color: '#6B46C1' },
  content: { padding: 16, paddingBottom: 40 },
  section: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E5EA' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 },
  bioInput: {
    backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111827', textAlignVertical: 'top', minHeight: 100,
  },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  priceLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#374151' },
  priceInput: { width: 80, backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#111827', textAlign: 'center' },
  priceUnit: { fontSize: 12, color: '#6B7280', width: 40 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
});
