import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Star } from 'lucide-react-native';
import { Card } from '@/components/Card';
import Colors from '@/constants/colors';

interface AstrologerCardProps {
  astrologer: {
    id: string;
    name: string;
    expertise: string;
    rating: number;
    image: string;
  };
  onPress: (id: string) => void;
}

export const AstrologerCard = React.memo(({ astrologer, onPress }: AstrologerCardProps) => (
  <Card 
    variant="elevated"
    borderRadius="lg"
    padding="sm"
    style={styles.card}
    onPress={() => onPress(astrologer.id)}
    accessibilityLabel={`${astrologer.name}, ${astrologer.expertise}, rated ${astrologer.rating} stars`}
  >
    <View style={styles.content} accessibilityElementsHidden>
      <Image 
        source={{ uri: astrologer.image }} 
        style={styles.astrologerImage}
        contentFit="cover"
        transition={1000}
        accessibilityLabel={`Photo of ${astrologer.name}`}
      />
      <View style={styles.astrologerInfo}>
        <Text style={styles.astrologerName} numberOfLines={1}>{astrologer.name}</Text>
        <Text style={styles.astrologerExpertise} numberOfLines={1}>{astrologer.expertise}</Text>
        <View style={styles.ratingContainer}>
          <Star size={14} color="#FFD700" fill="#FFD700" />
          <Text style={styles.ratingText}>{astrologer.rating}</Text>
        </View>
      </View>
    </View>
  </Card>
));

AstrologerCard.displayName = 'AstrologerCard';

const styles = StyleSheet.create({
  card: { width: 220, marginRight: 16 },
  content: { flexDirection: 'row', alignItems: 'center', minHeight: 70 },
  astrologerImage: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#F0F0F0' },
  astrologerInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  astrologerName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  astrologerExpertise: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  ratingText: { fontSize: 12, color: Colors.text, fontWeight: '700' },
});
