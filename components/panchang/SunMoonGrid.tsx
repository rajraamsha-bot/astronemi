import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface SunMoonItemProps {
  icon: string;
  label: string;
  value: string;
}

const SunMoonItem = React.memo(({ icon, label, value }: SunMoonItemProps) => (
  <View style={styles.sunMoonItem}>
    <Text style={styles.sunMoonIcon}>{icon}</Text>
    <Text style={styles.sunMoonLabel}>{label}</Text>
    <Text style={styles.sunMoonValue}>{value}</Text>
  </View>
));
SunMoonItem.displayName = 'SunMoonItem';

interface SunMoonGridProps {
  data: {
    sunrise: string;
    sunset: string;
    moonrise: string;
    sunRashi: string;
    moonRashi: string;
    paksha: string;
  };
}

export const SunMoonGrid = React.memo(({ data }: SunMoonGridProps) => {
  const items = [
    { icon: '🌅', label: 'Sunrise', value: data.sunrise },
    { icon: '🌇', label: 'Sunset', value: data.sunset },
    { icon: '🌙', label: 'Moonrise', value: data.moonrise },
    { icon: '♈', label: 'Sun Rashi', value: data.sunRashi.split(' ')[0] ?? '' },
    { icon: '🌙', label: 'Moon Rashi', value: data.moonRashi.split(' ')[0] ?? '' },
    { icon: '📅', label: 'Paksha', value: `${data.paksha} Paksha` },
  ];

  return (
    <View style={styles.sunMoonGrid}>
      {items.map((item, i) => (
        <SunMoonItem key={i} {...item} />
      ))}
    </View>
  );
});
SunMoonGrid.displayName = 'SunMoonGrid';

const styles = StyleSheet.create({
  sunMoonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sunMoonItem: { width: '30%', backgroundColor: Colors.background, borderRadius: 10, padding: 10, alignItems: 'center' },
  sunMoonIcon: { fontSize: 20, marginBottom: 4 },
  sunMoonLabel: { fontSize: 10, color: Colors.textLight, textAlign: 'center', marginBottom: 4 },
  sunMoonValue: { fontSize: 12, fontWeight: '700', color: Colors.text, textAlign: 'center' },
});
