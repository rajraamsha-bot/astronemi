import React, { useState, useEffect } from 'react';
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
  Info,
  Search,
  Leaf,
  Star,
  ChevronRight,
  Shield,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useUserEngagement } from '@/contexts/UserEngagementContext';
import FeatureLockModal from '@/components/FeatureLockModal';

const nadiTypes = [
  {
    id: '1',
    name: 'Sukra Nadi',
    description: 'Predictions related to Venus - love, marriage, luxury',
    icon: ' Venus',
    color: '#E91E63',
  },
  {
    id: '2',
    name: 'Chandra Nadi',
    description: 'Predictions related to Moon - mind, emotions, mother',
    icon: 'Moon',
    color: '#9C27B0',
  },
  {
    id: '3',
    name: 'Surya Nadi',
    description: 'Predictions related to Sun - soul, father, authority',
    icon: 'Sun',
    color: '#FF9800',
  },
  {
    id: '4',
    name: 'Budha Nadi',
    description: 'Predictions related to Mercury - intelligence, business',
    icon: 'Mercury',
    color: '#4CAF50',
  },
  {
    id: '5',
    name: 'Guru Nadi',
    description: 'Predictions related to Jupiter - wisdom, children, wealth',
    icon: 'Jupiter',
    color: '#2196F3',
  },
  {
    id: '6',
    name: 'Shani Nadi',
    description: 'Predictions related to Saturn - karma, longevity, service',
    icon: 'Saturn',
    color: '#607D8B',
  },
];

const nadiCenters = [
  {
    id: '1',
    name: 'Vaitheeswaran Koil',
    location: 'Tamil Nadu',
    description: 'The most famous Nadi astrology center',
    image: 'https://images.unsplash.com/photo-1544568100-34f6f5c42a88?w=400',
  },
  {
    id: '2',
    name: 'Agasthiyar Nadi',
    location: 'Kerala',
    description: 'Ancient palm leaf readings by Sage Agastya',
    image: 'https://images.unsplash.com/photo-1544568100-34f6f5c42a88?w=400',
  },
];

const nadiChapters = [
  { id: '1', name: 'General Chapter', tamil: 'Kandam 1', description: 'Overview of life, family, and general predictions' },
  { id: '2', name: 'Money & Wealth', tamil: 'Kandam 2', description: 'Financial prospects and wealth accumulation' },
  { id: '3', name: 'Siblings', tamil: 'Kandam 3', description: 'Relationship with brothers and sisters' },
  { id: '4', name: 'Property & Vehicles', tamil: 'Kandam 4', description: 'Real estate, vehicles, and material possessions' },
  { id: '5', name: 'Children', tamil: 'Kandam 5', description: 'Progeny, children\'s future, and education' },
  { id: '6', name: 'Health & Disease', tamil: 'Kandam 6', description: 'Health issues and remedies' },
  { id: '7', name: 'Marriage', tamil: 'Kandam 7', description: 'Marriage, spouse details, and relationship' },
  { id: '8', name: 'Life Span', tamil: 'Kandam 8', description: 'Longevity and major life events' },
  { id: '9', name: 'Father & Spirituality', tamil: 'Kandam 9', description: 'Father, spiritual path, and religious deeds' },
  { id: '10', name: 'Career', tamil: 'Kandam 10', description: 'Profession, business, and career growth' },
  { id: '11', name: 'Profits & Gains', tamil: 'Kandam 11', description: 'Income sources and unexpected gains' },
  { id: '12', name: 'Expenditure & Foreign', tamil: 'Kandam 12', description: 'Expenses, foreign travel, and moksha' },
];

export default function NadiAstrologyScreen() {
  const { checkAccess, showLockModal, lockedFeature, closeLockModal } = useFeatureAccess();
  const { currentTier, tierProgress } = useUserEngagement();
  
  const [selectedNadi, setSelectedNadi] = useState<string | null>(null);

  // Check feature access on mount
  useEffect(() => {
    if (!checkAccess('nadi')) {
      setTimeout(() => router.back(), 100);
    }
  }, [checkAccess]);

  const renderNadiType = (nadi: typeof nadiTypes[0]) => (
    <TouchableOpacity
      key={nadi.id}
      style={[
        styles.nadiTypeCard,
        selectedNadi === nadi.id && styles.nadiTypeCardSelected,
      ]}
      onPress={() => setSelectedNadi(selectedNadi === nadi.id ? null : nadi.id)}
    >
      <View style={[styles.nadiTypeIcon, { backgroundColor: nadi.color + '20' }]}>
        <Star color={nadi.color} size={24} />
      </View>
      <View style={styles.nadiTypeContent}>
        <Text style={styles.nadiTypeName}>{nadi.name}</Text>
        <Text style={styles.nadiTypeDesc}>{nadi.description}</Text>
      </View>
      <ChevronRight color={Colors.textLight} size={20} />
    </TouchableOpacity>
  );

  const renderChapter = (chapter: typeof nadiChapters[0]) => (
    <View key={chapter.id} style={styles.chapterCard}>
      <View style={styles.chapterHeader}>
        <Text style={styles.chapterTamil}>{chapter.tamil}</Text>
        <Text style={styles.chapterName}>{chapter.name}</Text>
      </View>
      <Text style={styles.chapterDesc}>{chapter.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#004D40', '#00695C', '#00796B']}
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
            <Text style={styles.headerTitle}>Nadi Astrology</Text>
            <TouchableOpacity style={styles.infoButton}>
              <Info color="#FFF" size={22} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Leaf color="#4CAF50" size={20} />
            <Text style={styles.infoCardTitle}>Ancient Palm Leaf Readings</Text>
          </View>
          <Text style={styles.infoCardText}>
            Nadi Astrology is an ancient form of Hindu astrology practiced in Tamil Nadu.
            The predictions are written on palm leaves by ancient sages (Rishis) like
            Agastya and Bhrigu, dating back thousands of years.
          </Text>
        </View>

        {/* How it Works */}
        <View style={styles.howItWorks}>
          <Text style={styles.sectionTitle}>How Nadi Reading Works</Text>
          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Provide Thumb Impression</Text>
              <Text style={styles.stepDesc}>
                Your right thumb impression (for males) or left (for females) is used to locate your leaf
              </Text>
            </View>
          </View>
          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Search for Your Leaf</Text>
              <Text style={styles.stepDesc}>
                The Nadi reader searches through bundles of palm leaves to find your specific leaf
              </Text>
            </View>
          </View>
          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Read Predictions</Text>
              <Text style={styles.stepDesc}>
                Once found, the predictions are read from the leaf in ancient Tamil verse
              </Text>
            </View>
          </View>
        </View>

        {/* Nadi Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Types of Nadi</Text>
          {nadiTypes.map(renderNadiType)}
        </View>

        {/* Nadi Centers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Famous Nadi Centers</Text>
          {nadiCenters.map((center) => (
            <TouchableOpacity key={center.id} style={styles.centerCard}>
              <Image source={{ uri: center.image }} style={styles.centerImage} />
              <View style={styles.centerContent}>
                <Text style={styles.centerName}>{center.name}</Text>
                <Text style={styles.centerLocation}>{center.location}</Text>
                <Text style={styles.centerDesc}>{center.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chapters */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nadi Chapters (Kandams)</Text>
          <Text style={styles.sectionSubtitle}>
            Each chapter covers specific aspects of your life
          </Text>
          <View style={styles.chaptersGrid}>
            {nadiChapters.map(renderChapter)}
          </View>
        </View>



        {/* Book Reading */}
        <View style={styles.bookSection}>
          <Text style={styles.sectionTitle}>Book Your Nadi Reading</Text>
          <TouchableOpacity style={styles.bookButton}>
            <Search color="#FFF" size={20} />
            <Text style={styles.bookButtonText}>Find Your Nadi Leaf</Text>
          </TouchableOpacity>
          <Text style={styles.bookNote}>
            Note: Authentic Nadi readings require physical presence at Nadi centers in Tamil Nadu
          </Text>
        </View>

        {/* Authenticity Note */}
        <View style={styles.authenticityCard}>
          <Shield color="#4CAF50" size={20} />
          <Text style={styles.authenticityTitle}>Authenticity Note</Text>
          <Text style={styles.authenticityText}>
            Genuine Nadi leaves are ancient manuscripts. Be cautious of online services
            claiming to provide instant Nadi readings. Authentic readings require
            in-person consultation at certified Nadi centers.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

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
  infoButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  infoCardText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  howItWorks: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  nadiTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nadiTypeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '05',
  },
  nadiTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nadiTypeContent: {
    flex: 1,
  },
  nadiTypeName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  nadiTypeDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  centerCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  centerImage: {
    width: '100%',
    height: 120,
  },
  centerContent: {
    padding: 14,
  },
  centerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  centerLocation: {
    fontSize: 12,
    color: Colors.primary,
    marginBottom: 6,
  },
  centerDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chaptersGrid: {
    gap: 10,
  },
  chapterCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 10,
  },
  chapterTamil: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  chapterName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  chapterDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  predictionSection: {
    margin: 16,
    marginTop: 0,
  },
  predictionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  predictionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  predictionContent: {
    marginTop: 16,
  },
  predictionBlock: {
    marginBottom: 16,
  },
  predictionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 6,
  },
  predictionText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
  },
  remediesBlock: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  remediesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  remedyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  remedyText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  bookSection: {
    margin: 16,
    marginTop: 0,
    alignItems: 'center',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 10,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  bookNote: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  authenticityCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  authenticityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginTop: 8,
    marginBottom: 6,
  },
  authenticityText: {
    fontSize: 13,
    color: '#1B5E20',
    lineHeight: 20,
  },
});
