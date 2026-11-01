import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  PawPrint,
  Sun,
  Moon,
  Star,
  Info,
  Sparkles,
  Activity,
  Brain,
  Shield,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';

interface PetProfile {
  name: string;
  type: string;
  breed: string;
  birthDate: string;
  zodiac: string;
  element: string;
  image: string;
}

interface PetTrait {
  name: string;
  score: number;
  description: string;
}

interface Compatibility {
  sign: string;
  compatibility: number;
  description: string;
}

const petProfile: PetProfile = {
  name: 'Bruno',
  type: 'Dog',
  breed: 'Golden Retriever',
  birthDate: 'June 15, 2022',
  zodiac: 'Gemini',
  element: 'Air',
  image: 'https://images.unsplash.com/photo-1552053844-1b2275cb257c?w=400',
};

const petTraits: PetTrait[] = [
  { name: 'Playfulness', score: 92, description: 'Very energetic and loves to play' },
  { name: 'Loyalty', score: 88, description: 'Extremely devoted to family' },
  { name: 'Intelligence', score: 85, description: 'Quick learner, easy to train' },
  { name: 'Social Skills', score: 90, description: 'Gets along well with other pets' },
  { name: 'Adaptability', score: 78, description: 'Adjusts well to new environments' },
  { name: 'Protectiveness', score: 70, description: 'Moderate guarding instincts' },
];

const compatibilityData: Compatibility[] = [
  { sign: 'Aries', compatibility: 85, description: 'Great match for active play' },
  { sign: 'Leo', compatibility: 90, description: 'Perfect companion sign' },
  { sign: 'Libra', compatibility: 88, description: 'Balanced and harmonious' },
  { sign: 'Aquarius', compatibility: 82, description: 'Intellectual connection' },
  { sign: 'Taurus', compatibility: 65, description: 'May need patience' },
  { sign: 'Scorpio', compatibility: 60, description: 'Intensity differences' },
];

export default function PetAstrologyScreen() {
  const [selectedTrait, setSelectedTrait] = useState<PetTrait | null>(null);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#795548', '#8D6E63', '#A1887F']}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Pet Astrology</Text>
            <View style={styles.placeholder} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Info color="#795548" size={18} />
          <Text style={styles.infoText}>
            Pet astrology helps understand your pet&apos;s personality, behavior patterns,
            and compatibility based on their birth chart.
          </Text>
        </View>

        {/* Pet Profile */}
        <View style={styles.profileCard}>
          <Image source={{ uri: petProfile.image }} style={styles.petImage} />
          <View style={styles.petInfo}>
            <View style={styles.petNameRow}>
              <PawPrint color="#795548" size={20} />
              <Text style={styles.petName}>{petProfile.name}</Text>
            </View>
            <Text style={styles.petDetail}>{petProfile.type} - {petProfile.breed}</Text>
            <Text style={styles.petDetail}>Born: {petProfile.birthDate}</Text>
            <View style={styles.zodiacBadge}>
              <Star color="#FFC107" size={14} />
              <Text style={styles.zodiacText}>{petProfile.zodiac} | {petProfile.element}</Text>
            </View>
          </View>
        </View>

        {/* Personality Overview */}
        <View style={styles.overviewCard}>
          <Text style={styles.sectionTitle}>Personality Overview</Text>
          <View style={styles.overviewContent}>
            <View style={styles.overviewItem}>
              <Sun color="#FF9800" size={18} />
              <View style={styles.overviewText}>
                <Text style={styles.overviewLabel}>Sun Sign</Text>
                <Text style={styles.overviewValue}>{petProfile.zodiac}</Text>
              </View>
            </View>
            <View style={styles.overviewItem}>
              <Moon color="#3F51B5" size={18} />
              <View style={styles.overviewText}>
                <Text style={styles.overviewLabel}>Moon Sign</Text>
                <Text style={styles.overviewValue}>Libra</Text>
              </View>
            </View>
            <View style={styles.overviewItem}>
              <Sparkles color="#9C27B0" size={18} />
              <View style={styles.overviewText}>
                <Text style={styles.overviewLabel}>Rising Sign</Text>
                <Text style={styles.overviewValue}>Sagittarius</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pet Traits */}
        <Text style={styles.sectionTitle}>Behavioral Traits</Text>
        <View style={styles.traitsContainer}>
          {petTraits.map((trait, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.traitCard,
                selectedTrait?.name === trait.name && styles.traitCardSelected,
              ]}
              onPress={() => setSelectedTrait(
                selectedTrait?.name === trait.name ? null : trait
              )}
            >
              <View style={styles.traitHeader}>
                <Text style={styles.traitName}>{trait.name}</Text>
                <Text style={styles.traitScore}>{trait.score}%</Text>
              </View>
              <View style={styles.traitBar}>
                <View
                  style={[
                    styles.traitBarFill,
                    { width: `${trait.score}%` },
                  ]}
                />
              </View>
              {selectedTrait?.name === trait.name && (
                <Text style={styles.traitDescription}>{trait.description}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Compatibility */}
        <Text style={styles.sectionTitle}>Owner Compatibility</Text>
        <View style={styles.compatibilityCard}>
          <Text style={styles.compatibilityNote}>
            Best owner zodiac matches for {petProfile.name}
          </Text>
          {compatibilityData.map((item, index) => (
            <View key={index} style={styles.compatibilityItem}>
              <View style={styles.compatibilityLeft}>
                <Text style={styles.compatibilitySign}>{item.sign}</Text>
                <Text style={styles.compatibilityDesc}>{item.description}</Text>
              </View>
              <View style={styles.compatibilityRight}>
                <View style={styles.compatibilityBar}>
                  <View
                    style={[
                      styles.compatibilityFill,
                      { width: `${item.compatibility}%` },
                    ]}
                  />
                </View>
                <Text style={styles.compatibilityScore}>{item.compatibility}%</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Health Insights */}
        <Text style={styles.sectionTitle}>Health & Wellness Insights</Text>
        <View style={styles.healthCard}>
          <View style={styles.healthItem}>
            <Activity color="#F44336" size={18} />
            <View style={styles.healthContent}>
              <Text style={styles.healthTitle}>Energy Levels</Text>
              <Text style={styles.healthText}>High energy periods in morning and evening</Text>
            </View>
          </View>
          <View style={styles.healthItem}>
            <Brain color="#9C27B0" size={18} />
            <View style={styles.healthContent}>
              <Text style={styles.healthTitle}>Mental Stimulation</Text>
              <Text style={styles.healthText}>Needs variety to prevent boredom</Text>
            </View>
          </View>
          <View style={styles.healthItem}>
            <Shield color="#4CAF50" size={18} />
            <View style={styles.healthContent}>
              <Text style={styles.healthTitle}>Health Focus</Text>
              <Text style={styles.healthText}>Watch for respiratory sensitivity</Text>
            </View>
          </View>
        </View>

        {/* Tips */}
        <Text style={styles.sectionTitle}>Care Tips Based on Zodiac</Text>
        <View style={styles.tipsCard}>
          <View style={styles.tipItem}>
            <View style={[styles.tipNumber, { backgroundColor: '#EFEBE9' }]}>
              <Text style={[styles.tipNumberText, { color: '#795548' }]}>1</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Social Activities</Text>
              <Text style={styles.tipDescription}>
                Gemini pets need regular social interaction with other pets.
              </Text>
            </View>
          </View>
          <View style={styles.tipItem}>
            <View style={[styles.tipNumber, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[styles.tipNumberText, { color: '#1976D2' }]}>2</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Mental Games</Text>
              <Text style={styles.tipDescription}>
                Puzzle toys and training sessions keep them engaged.
              </Text>
            </View>
          </View>
          <View style={styles.tipItem}>
            <View style={[styles.tipNumber, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.tipNumberText, { color: '#388E3C' }]}>3</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Communication</Text>
              <Text style={styles.tipDescription}>
                They respond well to verbal commands and praise.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFEBE9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#5D4037',
    lineHeight: 17,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  petImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  petInfo: {
    marginLeft: 14,
    flex: 1,
  },
  petNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  petName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  petDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  zodiacBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  zodiacText: {
    fontSize: 11,
    color: '#F57F17',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  overviewCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  overviewContent: {
    gap: 12,
  },
  overviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  overviewText: {
    flex: 1,
  },
  overviewLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  overviewValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  traitsContainer: {
    marginBottom: 16,
  },
  traitCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  traitCardSelected: {
    borderColor: '#795548',
    borderWidth: 2,
  },
  traitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  traitName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  traitScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#795548',
  },
  traitBar: {
    height: 6,
    backgroundColor: Colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  traitBarFill: {
    height: '100%',
    backgroundColor: '#795548',
    borderRadius: 3,
  },
  traitDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  compatibilityCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compatibilityNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  compatibilityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  compatibilityLeft: {
    flex: 1,
  },
  compatibilitySign: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  compatibilityDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  compatibilityRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compatibilityBar: {
    width: 60,
    height: 4,
    backgroundColor: Colors.background,
    borderRadius: 2,
    overflow: 'hidden',
  },
  compatibilityFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  compatibilityScore: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4CAF50',
    width: 35,
    textAlign: 'right',
  },
  healthCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  healthItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  healthContent: {
    flex: 1,
  },
  healthTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  healthText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tipsCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  tipNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipNumberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  tipDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
});