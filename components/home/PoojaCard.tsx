import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface PoojaCardProps {
  pooja: {
    id: string;
    title: string;
    icon: LucideIcon;
    color: string;
    price: string;
  };
  onPress: () => void;
}

export const PoojaCard = React.memo(({ pooja, onPress }: PoojaCardProps) => (
  <TouchableOpacity 
    style={styles.poojaCard}
    onPress={onPress}
  >
    <View style={[styles.poojaImageContainer, { backgroundColor: pooja.color + '15' }]}>
      <pooja.icon size={36} color={pooja.color} />
    </View>
    <View style={styles.poojaInfo}>
      <Text style={styles.poojaTitle} numberOfLines={1}>{pooja.title}</Text>
      <Text style={styles.poojaPrice}>{pooja.price}</Text>
      <View style={[styles.bookPoojaBtn, { backgroundColor: pooja.color + '10' }]}>
        <Text style={[styles.bookPoojaText, { color: pooja.color }]}>Book Now</Text>
      </View>
    </View>
  </TouchableOpacity>
));

PoojaCard.displayName = 'PoojaCard';

const styles = StyleSheet.create({
  poojaCard: { width: 140, marginRight: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#EEE', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  poojaImageContainer: { height: 70, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  poojaInfo: { alignItems: 'center' },
  poojaTitle: { fontSize: 14, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4, textAlign: 'center' },
  poojaPrice: { fontSize: 13, color: '#666', marginBottom: 12, fontWeight: '600' },
  bookPoojaBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20 },
  bookPoojaText: { fontSize: 12, fontWeight: 'bold' },
});
