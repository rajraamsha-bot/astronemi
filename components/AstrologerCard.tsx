import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Star, BadgeCheck, Languages, Sparkles } from 'lucide-react-native';
import { AppTheme } from '@/contexts/ThemeContext';
import { createButtonA11yProps } from '@/utils/accessibility-helpers';
import type { UiAstrologer } from '@/lib/database.types';

interface AstrologerCardProps {
  astrologer: UiAstrologer;
  Colors: AppTheme;
}

export const AstrologerCard = React.memo(({ astrologer, Colors }: AstrologerCardProps) => {
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/astrologer/${astrologer.id}`)}
      activeOpacity={0.9}
      {...createButtonA11yProps(
        `${astrologer.name}, ${astrologer.rating} stars, ${astrologer.experience} years experience, ₹${astrologer.pricePerMinute} per minute`,
        `View ${astrologer.name}'s profile and book consultation`
      )}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: astrologer.image || undefined }} 
          style={styles.image}
          contentFit="cover"
          transition={500}
          placeholder="|rF?hV%2WCj[ayj[a|j[ayofayayj[fQoff7azayj[ayj[j[ayofayayayj[fQofayayayj[ayj[ayj[ayj[ayof"
        />
        {astrologer.isAi ? (
          <View style={styles.aiBadgePill}>
            <Sparkles size={10} color={Colors.white} />
            <Text style={styles.aiBadgePillText}>INSTANT</Text>
          </View>
        ) : astrologer.isOnline ? (
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        ) : (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{astrologer.name}</Text>
          {astrologer.isAi && (
            <View style={styles.aiTag}>
              <Text style={styles.aiTagText}>AI</Text>
            </View>
          )}
          {astrologer.verified && !astrologer.isAi && (
            <BadgeCheck size={18} color={Colors.primary} fill={Colors.primary} />
          )}
        </View>

        <View style={styles.ratingRow}>
          <Star size={14} color={Colors.gold} fill={Colors.gold} />
          <Text style={styles.rating}>{astrologer.rating}</Text>
          <Text style={styles.reviews}>({astrologer.reviews} reviews)</Text>
        </View>

        <Text style={styles.expertise}>{astrologer.expertise}</Text>

        <View style={styles.specializations}>
          {astrologer.specialization.slice(0, 3).map((spec: string, idx: number) => (
            <View key={idx} style={styles.specTag}>
              <Text style={styles.specText}>{spec}</Text>
            </View>
          ))}
        </View>

        <View style={styles.languageRow}>
          <Languages size={14} color={Colors.textLight} />
          <Text style={styles.languages}>{astrologer.languages.join(', ')}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.experience}>{astrologer.experience} years exp</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹{astrologer.pricePerMinute}/min</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

AstrologerCard.displayName = 'AstrologerCard';

const createStyles = (Colors: AppTheme) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    alignItems: 'center',
    width: 100,
  },
  image: {
    width: 100,
    height: 120,
    borderRadius: 12,
    backgroundColor: Colors.border,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  rating: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  reviews: {
    fontSize: 12,
    color: Colors.textLight,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
    textTransform: 'uppercase',
  },
  offlineBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  offlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textLight,
    textTransform: 'uppercase',
  },
  aiBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  aiBadgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  aiTag: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  expertise: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
  },
  specializations: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  specTag: {
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  specText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  languages: {
    fontSize: 12,
    color: Colors.textLight,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  experience: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
  },
  priceContainer: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
});
