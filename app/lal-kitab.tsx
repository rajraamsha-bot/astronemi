import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  BookOpen, Sun, Moon, Mars, Heart, Circle, Star, TrendingUp,
  ChevronRight, X, Home,
  Briefcase, AlertTriangle, Sparkles, ArrowLeft
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useUserEngagement } from '@/contexts/UserEngagementContext';
import FeatureLockModal from '@/components/FeatureLockModal';

// Planet icon mappings (using available lucide icons)
const Venus = Heart;
const Jupiter = Star;
const Saturn = Circle;
const Mercury = TrendingUp;
const Rahu = TrendingUp;
const Ketu = Moon;

interface LalKitabRemedy {
  id: string;
  planet: string;
  sanskritName: string;
  icon: React.ComponentType<{size?: number; color?: string}>;
  color: string;
  problems: string[];
  remedies: string[];
  precautions: string[];
  benefits: string[];
}

const lalKitabRemedies: LalKitabRemedy[] = [
  {
    id: '1',
    planet: 'Sun',
    sanskritName: 'Surya',
    icon: Sun,
    color: '#ff9800',
    problems: ['Low confidence', 'Government obstacles', 'Father issues', 'Eye problems', 'Heart ailments'],
    remedies: [
      'Offer water to Sun every morning',
      'Feed wheat to birds',
      'Respect father and elders',
      'Wear copper coin in neck',
      'Donate wheat on Sundays',
      'Keep a copper vessel in house',
    ],
    precautions: [
      'Avoid eating salty food on Sundays',
      'Do not accept copper as gift',
      'Avoid keeping ivory items',
    ],
    benefits: ['Improved confidence', 'Government job prospects', 'Better relationship with father', 'Health improvement'],
  },
  {
    id: '2',
    planet: 'Moon',
    sanskritName: 'Chandra',
    icon: Moon,
    color: '#9c27b0',
    problems: ['Mental stress', 'Mother issues', 'Water-related problems', 'Emotional instability', 'Sleep disorders'],
    remedies: [
      'Feed milk to dogs',
      'Keep silver in house',
      'Respect and serve mother',
      'Donate milk on Mondays',
      'Avoid keeping silver in open',
      'Wear pearl after consultation',
    ],
    precautions: [
      'Do not drink milk at night',
      'Avoid keeping silver unused',
      'Do not wash clothes on Mondays',
    ],
    benefits: ['Mental peace', 'Better sleep', 'Improved relationship with mother', 'Emotional stability'],
  },
  {
    id: '3',
    planet: 'Mars',
    sanskritName: 'Mangal',
    icon: Mars,
    color: '#d32f2f',
    problems: ['Property disputes', 'Sibling conflicts', 'Accidents', 'Blood disorders', 'Anger issues'],
    remedies: [
      'Feed sweets to birds',
      'Donate red lentils on Tuesdays',
      'Keep deer skin in house',
      'Worship Lord Hanuman',
      'Help siblings',
      'Wear red coral after consultation',
    ],
    precautions: [
      'Avoid keeping ivory or deer skin',
      'Do not eat non-veg on Tuesdays',
      'Avoid arguments with siblings',
    ],
    benefits: ['Property gains', 'Harmony with siblings', 'Protection from accidents', 'Reduced anger'],
  },
  {
    id: '4',
    planet: 'Mercury',
    sanskritName: 'Budh',
    icon: Mercury,
    color: '#00bcd4',
    problems: ['Education obstacles', 'Business losses', 'Speech problems', 'Skin issues', 'Nervous disorders'],
    remedies: [
      'Feed green grass to cows',
      'Donate green items on Wednesdays',
      'Keep parrot or pigeon',
      'Wear emerald after consultation',
      'Serve unmarried girls',
      'Keep ivory items in house',
    ],
    precautions: [
      'Do not keep green clothes unused',
      'Avoid eating meat on Wednesdays',
      'Do not harm birds',
    ],
    benefits: ['Education success', 'Business growth', 'Better communication', 'Skin health'],
  },
  {
    id: '5',
    planet: 'Jupiter',
    sanskritName: 'Guru',
    icon: Jupiter,
    color: '#ffc107',
    problems: ['Marriage delays', 'Children issues', 'Education problems', 'Liver problems', 'Financial instability'],
    remedies: [
      'Feed chana dal to cows',
      'Donate yellow items on Thursdays',
      'Worship Lord Vishnu',
      'Wear yellow sapphire',
      'Respect teachers and elders',
      'Keep yellow cloth in pooja room',
    ],
    precautions: [
      'Avoid eating banana on Thursdays',
      'Do not keep gold unused',
      'Avoid non-vegetarian food on Thursdays',
    ],
    benefits: ['Marriage prospects', 'Children blessings', 'Education success', 'Financial stability'],
  },
  {
    id: '6',
    planet: 'Venus',
    sanskritName: 'Shukra',
    icon: Venus,
    color: '#e91e63',
    problems: ['Marriage problems', 'Relationship issues', 'Luxury losses', 'Vehicle problems', 'Kidney issues'],
    remedies: [
      'Donate white items on Fridays',
      'Feed cows with green fodder',
      'Wear diamond after consultation',
      'Respect women',
      'Keep white flowers in house',
      'Donate to young girls',
    ],
    precautions: [
      'Avoid white clothes on Fridays',
      'Do not keep diamonds unused',
      'Avoid relationship conflicts',
    ],
    benefits: ['Marriage harmony', 'Luxury gains', 'Vehicle happiness', 'Better relationships'],
  },
  {
    id: '7',
    planet: 'Saturn',
    sanskritName: 'Shani',
    icon: Saturn,
    color: '#1a237e',
    problems: ['Career obstacles', 'Long-term illnesses', 'Property losses', 'Legal issues', 'Sade Sati effects'],
    remedies: [
      'Donate iron on Saturdays',
      'Feed crows and stray dogs',
      'Worship Lord Hanuman',
      'Light mustard oil lamp at Shani temple',
      'Help the poor and needy',
      'Wear blue sapphire after trial',
    ],
    precautions: [
      'Avoid buying iron on Saturdays',
      'Do not drink milk at night',
      'Avoid keeping leather items',
    ],
    benefits: ['Career progress', 'Health improvement', 'Legal relief', 'Sade Sati relief'],
  },
  {
    id: '8',
    planet: 'Rahu',
    sanskritName: 'Rahu',
    icon: Rahu,
    color: '#4a148c',
    problems: ['Confusion', 'Sudden losses', 'Foreign obstacles', 'Skin diseases', 'Mental unrest'],
    remedies: [
      'Donate black sesame seeds',
      'Feed birds and stray animals',
      'Keep dogs as pets',
      'Wear hessonite after consultation',
      'Avoid non-vegetarian food',
      'Chant Rahu mantra',
    ],
    precautions: [
      'Do not keep blue cloth unused',
      'Avoid eating left-over food',
      'Do not accept electronic items as gift',
    ],
    benefits: ['Mental clarity', 'Foreign opportunities', 'Financial stability', 'Health improvement'],
  },
  {
    id: '9',
    planet: 'Ketu',
    sanskritName: 'Ketu',
    icon: Ketu,
    color: '#795548',
    problems: ['Spiritual confusion', 'Sudden obstacles', 'Health issues', 'Accidents', 'Property disputes'],
    remedies: [
      'Donate blankets to poor',
      'Feed dogs and cows',
      'Wear cat\'s eye after consultation',
      'Worship Lord Ganesha',
      'Keep yellow cloth in pooja',
      'Chant Ketu mantra',
    ],
    precautions: [
      'Avoid keeping black dog',
      'Do not accept blankets as gift',
      'Avoid non-vegetarian food',
    ],
    benefits: ['Spiritual growth', 'Obstacle removal', 'Health protection', 'Property gains'],
  },
];

const problemCategories = [
  { id: 'career', name: 'Career', icon: Briefcase, color: Colors.primary },
  { id: 'marriage', name: 'Marriage', icon: Heart, color: Colors.error },
  { id: 'health', name: 'Health', icon: AlertTriangle, color: Colors.success },
  { id: 'property', name: 'Property', icon: Home, color: Colors.purple },
  { id: 'finance', name: 'Finance', icon: Star, color: Colors.gold },
];

export default function LalKitabScreen() {
  const { checkAccess, showLockModal, lockedFeature, closeLockModal } = useFeatureAccess();
  const { currentTier, tierProgress } = useUserEngagement();
  
  const [selectedPlanet, setSelectedPlanet] = useState<LalKitabRemedy | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Check feature access on mount
  useEffect(() => {
    if (!checkAccess('lal-kitab')) {
      setTimeout(() => router.back(), 100);
    }
  }, [checkAccess]);

  const getRemediesForCategory = (categoryId: string) => {
    const categoryProblems: Record<string, string[]> = {
      career: ['Government obstacles', 'Career obstacles', 'Business losses', 'Education problems'],
      marriage: ['Marriage delays', 'Marriage problems', 'Relationship issues'],
      health: ['Eye problems', 'Heart ailments', 'Mental stress', 'Blood disorders', 'Skin issues'],
      property: ['Property disputes', 'Property losses', 'Vehicle problems'],
      finance: ['Financial instability', 'Sudden losses', 'Luxury losses'],
    };

    return lalKitabRemedies.filter(remedy => 
      remedy.problems.some(p => categoryProblems[categoryId]?.includes(p))
    );
  };

  const filteredRemedies = selectedCategory 
    ? getRemediesForCategory(selectedCategory)
    : lalKitabRemedies;

  return (
    <>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft color={Colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lal Kitab Remedies</Text>
          <View style={styles.backButton} />
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <BookOpen size={32} color={Colors.white} />
            <Text style={styles.headerTitle}>Lal Kitab Remedies</Text>
            <Text style={styles.headerSubtitle}>
              Ancient wisdom for planetary remedies without expensive rituals
            </Text>
          </View>

          {/* About Lal Kitab */}
          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>What is Lal Kitab?</Text>
            <Text style={styles.aboutText}>
              Lal Kitab is a unique system of astrology that provides simple, practical remedies 
              for planetary afflictions. Unlike traditional Vedic remedies, Lal Kitab focuses on 
              everyday actions that anyone can perform without expensive rituals or ceremonies.
            </Text>
          </View>

          {/* Problem Categories */}
          <View style={styles.categorySection}>
            <Text style={styles.sectionTitle}>Remedies by Problem</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
            >
              <TouchableOpacity
                style={[styles.categoryTab, !selectedCategory && styles.categoryTabActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Star size={18} color={!selectedCategory ? Colors.white : Colors.text} />
                <Text style={[styles.categoryTabText, !selectedCategory && styles.categoryTabTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {problemCategories.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryTab, selectedCategory === cat.id && styles.categoryTabActive]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <IconComponent size={18} color={selectedCategory === cat.id ? Colors.white : cat.color} />
                    <Text style={[styles.categoryTabText, selectedCategory === cat.id && styles.categoryTabTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Planet Remedies */}
          <View style={styles.remediesSection}>
            <Text style={styles.sectionTitle}>Planetary Remedies</Text>
            
            {filteredRemedies.map((remedy) => {
              const IconComponent = remedy.icon;
              return (
                <TouchableOpacity
                  key={remedy.id}
                  style={styles.remedyCard}
                  onPress={() => setSelectedPlanet(remedy)}
                >
                  <View style={[styles.planetIcon, { backgroundColor: remedy.color + '20' }]}>
                    <IconComponent size={28} color={remedy.color} />
                  </View>
                  
                  <View style={styles.remedyInfo}>
                    <View style={styles.remedyHeader}>
                      <Text style={styles.planetName}>{remedy.planet}</Text>
                      <Text style={styles.sanskritName}>({remedy.sanskritName})</Text>
                    </View>
                    
                    <Text style={styles.problemsLabel}>Problems Addressed:</Text>
                    <Text style={styles.problemsText} numberOfLines={2}>
                      {remedy.problems.slice(0, 3).join(', ')}
                    </Text>
                    
                    <View style={styles.remedyCount}>
                      <Sparkles size={14} color={Colors.success} />
                      <Text style={styles.remedyCountText}>{remedy.remedies.length} remedies</Text>
                    </View>
                  </View>
                  
                  <ChevronRight size={20} color={Colors.textLight} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Important Note */}
          <View style={styles.noteCard}>
            <AlertTriangle size={20} color={Colors.gold} />
            <Text style={styles.noteTitle}>Important Note</Text>
            <Text style={styles.noteText}>
              Lal Kitab remedies should be performed with faith and consistency. Results may vary 
              based on individual karmic patterns. Consult a Lal Kitab expert for personalized guidance.
            </Text>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Planet Detail Modal */}
        <Modal
          visible={!!selectedPlanet}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedPlanet(null)}
        >
          {selectedPlanet && (
            <SafeAreaView style={styles.modal}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <View style={[styles.modalPlanetIcon, { backgroundColor: selectedPlanet.color }]}>
                    <selectedPlanet.icon size={24} color={Colors.white} />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>{selectedPlanet.planet}</Text>
                    <Text style={styles.modalSubtitle}>{selectedPlanet.sanskritName}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedPlanet(null)}>
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                {/* Problems */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Problems Addressed</Text>
                  <View style={styles.problemsList}>
                    {selectedPlanet.problems.map((problem, idx) => (
                      <View key={idx} style={styles.problemItem}>
                        <AlertTriangle size={14} color={Colors.error} />
                        <Text style={styles.problemText}>{problem}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Remedies */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Remedies</Text>
                  <Text style={styles.modalSectionSubtitle}>
                    Perform these remedies with faith and consistency
                  </Text>
                  {selectedPlanet.remedies.map((remedy, idx) => (
                    <View key={idx} style={styles.remedyItem}>
                      <View style={styles.remedyNumber}>
                        <Text style={styles.remedyNumberText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.remedyText}>{remedy}</Text>
                    </View>
                  ))}
                </View>

                {/* Precautions */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Precautions</Text>
                  <View style={styles.precautionsCard}>
                    {selectedPlanet.precautions.map((precaution, idx) => (
                      <View key={idx} style={styles.precautionItem}>
                        <X size={14} color={Colors.error} />
                        <Text style={styles.precautionText}>{precaution}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Benefits */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Expected Benefits</Text>
                  <View style={styles.benefitsList}>
                    {selectedPlanet.benefits.map((benefit, idx) => (
                      <View key={idx} style={styles.benefitItem}>
                        <Star size={14} color={Colors.success} fill={Colors.success} />
                        <Text style={styles.benefitText}>{benefit}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </SafeAreaView>
          )}
        </Modal>

        {/* Feature Lock Modal */}
        <FeatureLockModal
          visible={showLockModal}
          onClose={closeLockModal}
          featureName={lockedFeature?.name || ''}
          featureDescription={lockedFeature?.description}
          requiredTier={lockedFeature?.tier || currentTier}
          currentTier={currentTier}
          requiresSubscription={lockedFeature?.requiresSubscription}
          tierProgress={tierProgress}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  headerBanner: {
    backgroundColor: Colors.purple,
    padding: 20,
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },
  aboutCard: {
    backgroundColor: Colors.white,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 20,
  },
  categorySection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  categoryList: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    gap: 6,
    marginRight: 8,
  },
  categoryTabActive: {
    backgroundColor: Colors.primary,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  categoryTabTextActive: {
    color: Colors.white,
  },
  remediesSection: {
    padding: 16,
    gap: 12,
  },
  remedyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  planetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remedyInfo: {
    flex: 1,
  },
  remedyHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  planetName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  sanskritName: {
    fontSize: 12,
    color: Colors.textLight,
  },
  problemsLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 4,
  },
  problemsText: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 2,
  },
  remedyCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  remedyCountText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.success,
  },
  noteCard: {
    backgroundColor: '#FFF8E1',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  modal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalPlanetIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  modalSectionSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 12,
  },
  problemsList: {
    gap: 8,
  },
  problemItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  problemText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  remedyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  remedyNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remedyNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  remedyText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    lineHeight: 20,
  },
  precautionsCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  precautionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  precautionText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
});