import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface HealthItem {
  label: string;
  value: string;
}

interface HealthCardProps {
  items: HealthItem[];
}

const HealthCard: React.FC<HealthCardProps> = ({ items }) => (
  <View style={styles.healthCard}>
    {items.map((item, index) => (
      <View key={index} style={styles.healthItem}>
        <Text style={styles.healthLabel}>{item.label}</Text>
        <Text style={styles.healthValue}>{item.value}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  healthCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
  },
  healthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  healthLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  healthValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
});

export default HealthCard;