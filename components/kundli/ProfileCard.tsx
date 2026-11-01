/**
 * ProfileCard Component
 * 
 * Displays the basic profile information in the Kundli result
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star, Zap, Info } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { KundliData } from '@/utils/kundli-generator';

interface ProfileCardProps {
  kundliData: KundliData;
  onGenerateNew: () => void;
}

export function ProfileCard({ kundliData, onGenerateNew }: ProfileCardProps) {
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{kundliData.personalInfo.name}</Text>
        <Text style={styles.generateNew} onPress={onGenerateNew}>
          ← Generate New
        </Text>
      </View>
      
      <Text style={styles.info}>
        Born: {kundliData.personalInfo.dateTime.day}/{kundliData.personalInfo.dateTime.month}/{kundliData.personalInfo.dateTime.year} at 
        {String(kundliData.personalInfo.dateTime.hour).padStart(2, '0')}:
        {String(kundliData.personalInfo.dateTime.minute).padStart(2, '0')}
      </Text>
      <Text style={styles.info}>📍 {kundliData.personalInfo.displayPlace ?? kundliData.personalInfo.birthPlace}</Text>
      
      <View style={styles.ascendantBadge}>
        <Star size={16} color={Colors.primary} fill={Colors.primary} />
        <Text style={styles.ascendantText}>
          Lagna: {kundliData.ascendant.sign} ({kundliData.ascendant.degree.toFixed(2)}°)
        </Text>
      </View>
      
      {kundliData.ayanamsa != null && (
        <View style={styles.info}>
          <Info size={14} color={Colors.textLight} />
          <Text style={styles.info}>Lahiri Ayanamsa: {kundliData.ayanamsa.toFixed(4)}°</Text>
        </View>
      )}
      
      {kundliData.calculationSource === 'vedastro' && (
        <View style={styles.accuracyBadge}>
          <Zap size={14} color="#10B981" fill="#10B981" />
          <Text style={styles.accuracyText}>Swiss Ephemeris (VedAstro — Free)</Text>
        </View>
      )}
      
      {kundliData.calculationSource === 'fallback' && (
        <View style={styles.fallbackBadge}>
          <Info size={14} color="#F59E0B" />
          <Text style={styles.fallbackText}>
            Local calculations — add Prokerala API key for precision
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  generateNew: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  info: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  ascendantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8F4FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  ascendantText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  ayanamsaText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 8,
  },
  accuracyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  accuracyText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  fallbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  fallbackText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
});

export default ProfileCard;
