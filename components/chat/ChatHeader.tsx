import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Sparkles, ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';

const ChatHeader: React.FC = () => (
  <View style={styles.header}>
    <TouchableOpacity
      style={styles.backButton}
      onPress={() => router.back()}
    >
      <ArrowLeft color={Colors.white} size={24} />
    </TouchableOpacity>
    <View style={styles.headerIcon}>
      <Sparkles size={24} color={Colors.white} />
    </View>
    <View style={styles.headerInfo}>
      <Text style={styles.headerTitle}>AstroBot</Text>
      <Text style={styles.headerSubtitle}>AI-Powered Astrology Assistant</Text>
    </View>
    <View style={styles.freeBadge}>
      <Text style={styles.freeBadgeText}>FREE</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.purple,
    padding: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  freeBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
});

export default ChatHeader;