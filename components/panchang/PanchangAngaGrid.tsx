import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface PanchaItemProps {
  label: string;
  value: string;
  sub: string;
  icon: string;
  isAuspicious?: boolean;
  isInauspicious?: boolean;
}

const PanchaItem = React.memo(({ label, value, sub, icon, isAuspicious, isInauspicious }: PanchaItemProps) => (
  <View style={[
    styles.panchaItem, 
    isAuspicious && { borderColor: Colors.success },
    isInauspicious && { borderColor: Colors.error }
  ]}>
    <Text style={styles.panchaIcon}>{icon}</Text>
    <Text style={styles.panchaLabel}>{label}</Text>
    <Text style={styles.panchaValue}>{value}</Text>
    <Text style={styles.panchaSub}>{sub}</Text>
  </View>
));
PanchaItem.displayName = 'PanchaItem';

interface PanchangAngaGridProps {
  data: {
    vara: string;
    varaLord: string;
    tithi: string;
    paksha: string;
    tithiNumber: number;
    nakshatra: string;
    nakshatraLord: string;
    yoga: string;
    yogaType: 'auspicious' | 'inauspicious' | 'neutral';
    karana: string;
  };
}

export const PanchangAngaGrid = React.memo(({ data }: PanchangAngaGridProps) => {
  const items = [
    { label: 'Vara (Day)', value: data.vara, sub: `Lord: ${data.varaLord}`, icon: '☀️' },
    { label: 'Tithi', value: data.tithi, sub: `${data.paksha} Paksha · ${data.tithiNumber}`, icon: '🌙' },
    { label: 'Nakshatra', value: data.nakshatra, sub: `Lord: ${data.nakshatraLord}`, icon: '⭐' },
    { 
      label: 'Yoga', 
      value: data.yoga, 
      sub: data.yogaType === 'auspicious' ? '✅ Auspicious' : data.yogaType === 'inauspicious' ? '⚠️ Inauspicious' : '➖ Neutral', 
      icon: '🔮',
      isAuspicious: data.yogaType === 'auspicious',
      isInauspicious: data.yogaType === 'inauspicious'
    },
    { label: 'Karana', value: data.karana, sub: 'Half-Tithi', icon: '🌗' },
  ];

  return (
    <View style={styles.panchaGrid}>
      {items.map((item, i) => (
        <PanchaItem key={i} {...item} />
      ))}
    </View>
  );
});
PanchangAngaGrid.displayName = 'PanchangAngaGrid';

const styles = StyleSheet.create({
  panchaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  panchaItem: { width: '47%', backgroundColor: Colors.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  panchaIcon: { fontSize: 20, marginBottom: 6 },
  panchaLabel: { fontSize: 10, color: Colors.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  panchaValue: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  panchaSub: { fontSize: 11, color: Colors.textLight },
});
