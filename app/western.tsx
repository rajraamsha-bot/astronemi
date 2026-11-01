import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Info,
  ChevronDown,
  ChevronUp,
  Star,
  Sun,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';

interface WesternSign {
  name: string;
  symbol: string;
  dates: string;
  element: string;
  modality: string;
  ruler: string;
  traits: string[];
  strengths: string[];
  weaknesses: string[];
}

const westernSigns: WesternSign[] = [
  {
    name: 'Aries',
    symbol: ' ARIES',
    dates: 'Mar 21 - Apr 19',
    element: 'Fire',
    modality: 'Cardinal',
    ruler: 'Mars',
    traits: ['Courageous', 'Determined', 'Confident', 'Enthusiastic'],
    strengths: ['Leadership', 'Optimism', 'Passion'],
    weaknesses: ['Impatience', 'Impulsiveness', 'Short-tempered'],
  },
  {
    name: 'Taurus',
    symbol: ' TAURUS',
    dates: 'Apr 20 - May 20',
    element: 'Earth',
    modality: 'Fixed',
    ruler: 'Venus',
    traits: ['Reliable', 'Patient', 'Practical', 'Devoted'],
    strengths: ['Dependability', 'Persistence', 'Loyalty'],
    weaknesses: ['Stubbornness', 'Possessiveness', 'Materialism'],
  },
  {
    name: 'Gemini',
    symbol: ' GEMINI',
    dates: 'May 21 - Jun 20',
    element: 'Air',
    modality: 'Mutable',
    ruler: 'Mercury',
    traits: ['Gentle', 'Affectionate', 'Curious', 'Adaptable'],
    strengths: ['Communication', 'Wit', 'Versatility'],
    weaknesses: ['Indecisiveness', 'Superficiality', 'Nervousness'],
  },
  {
    name: 'Cancer',
    symbol: ' CANCER',
    dates: 'Jun 21 - Jul 22',
    element: 'Water',
    modality: 'Cardinal',
    ruler: 'Moon',
    traits: ['Loyal', 'Emotional', 'Sympathetic', 'Nurturing'],
    strengths: ['Intuition', 'Protectiveness', 'Tenacity'],
    weaknesses: ['Moodiness', 'Clinginess', 'Sentimentality'],
  },
  {
    name: 'Leo',
    symbol: ' LEO',
    dates: 'Jul 23 - Aug 22',
    element: 'Fire',
    modality: 'Fixed',
    ruler: 'Sun',
    traits: ['Creative', 'Passionate', 'Generous', 'Warm-hearted'],
    strengths: ['Charisma', 'Leadership', 'Humor'],
    weaknesses: ['Arrogance', 'Stubbornness', 'Self-centeredness'],
  },
  {
    name: 'Virgo',
    symbol: ' VIRGO',
    dates: 'Aug 23 - Sep 22',
    element: 'Earth',
    modality: 'Mutable',
    ruler: 'Mercury',
    traits: ['Analytical', 'Practical', 'Hardworking', 'Modest'],
    strengths: ['Attention to detail', 'Reliability', 'Helpfulness'],
    weaknesses: ['Overcritical', 'Perfectionism', 'Worry'],
  },
  {
    name: 'Libra',
    symbol: ' LIBRA',
    dates: 'Sep 23 - Oct 22',
    element: 'Air',
    modality: 'Cardinal',
    ruler: 'Venus',
    traits: ['Cooperative', 'Diplomatic', 'Fair-minded', 'Social'],
    strengths: ['Harmony', 'Grace', 'Idealism'],
    weaknesses: ['Indecisiveness', 'Avoidance', 'Self-pity'],
  },
  {
    name: 'Scorpio',
    symbol: ' SCORPIO',
    dates: 'Oct 23 - Nov 21',
    element: 'Water',
    modality: 'Fixed',
    ruler: 'Pluto',
    traits: ['Resourceful', 'Brave', 'Passionate', 'Stubborn'],
    strengths: ['Loyalty', 'Determination', 'Fearlessness'],
    weaknesses: ['Jealousy', 'Secretiveness', 'Obsessiveness'],
  },
  {
    name: 'Sagittarius',
    symbol: ' SAGITTARIUS',
    dates: 'Nov 22 - Dec 21',
    element: 'Fire',
    modality: 'Mutable',
    ruler: 'Jupiter',
    traits: ['Generous', 'Idealistic', 'Great humor', 'Adventurous'],
    strengths: ['Optimism', 'Honesty', 'Philosophy'],
    weaknesses: ['Impatience', 'Tactlessness', 'Promising too much'],
  },
  {
    name: 'Capricorn',
    symbol: ' CAPRICORN',
    dates: 'Dec 22 - Jan 19',
    element: 'Earth',
    modality: 'Cardinal',
    ruler: 'Saturn',
    traits: ['Responsible', 'Disciplined', 'Self-control', 'Ambitious'],
    strengths: ['Persistence', 'Practicality', 'Management'],
    weaknesses: ['Pessimism', 'Stubbornness', 'Workaholism'],
  },
  {
    name: 'Aquarius',
    symbol: ' AQUARIUS',
    dates: 'Jan 20 - Feb 18',
    element: 'Air',
    modality: 'Fixed',
    ruler: 'Uranus',
    traits: ['Progressive', 'Original', 'Independent', 'Humanitarian'],
    strengths: ['Innovation', 'Friendliness', 'Objectivity'],
    weaknesses: ['Emotional detachment', 'Unpredictability', 'Stubbornness'],
  },
  {
    name: 'Pisces',
    symbol: ' PISCES',
    dates: 'Feb 19 - Mar 20',
    element: 'Water',
    modality: 'Mutable',
    ruler: 'Neptune',
    traits: ['Compassionate', 'Artistic', 'Intuitive', 'Gentle'],
    strengths: ['Wisdom', 'Musical ability', 'Empathy'],
    weaknesses: ['Escapism', 'Idealism', 'Over-sensitivity'],
  },
];

const elements = [
  { name: 'Fire', signs: ['Aries', 'Leo', 'Sagittarius'], color: '#F44336', traits: 'Passionate, Dynamic, Temperamental' },
  { name: 'Earth', signs: ['Taurus', 'Virgo', 'Capricorn'], color: '#795548', traits: 'Grounded, Practical, Reliable' },
  { name: 'Air', signs: ['Gemini', 'Libra', 'Aquarius'], color: '#2196F3', traits: 'Intellectual, Communicative, Analytical' },
  { name: 'Water', signs: ['Cancer', 'Scorpio', 'Pisces'], color: '#00BCD4', traits: 'Emotional, Intuitive, Sensitive' },
];

const modalities = [
  { name: 'Cardinal', signs: ['Aries', 'Cancer', 'Libra', 'Capricorn'], description: 'Initiators, Leaders, Action-oriented' },
  { name: 'Fixed', signs: ['Taurus', 'Leo', 'Scorpio', 'Aquarius'], description: 'Stable, Determined, Persistent' },
  { name: 'Mutable', signs: ['Gemini', 'Virgo', 'Sagittarius', 'Pisces'], description: 'Adaptable, Flexible, Versatile' },
];

export default function WesternAstrologyScreen() {
  const [selectedSign, setSelectedSign] = useState<WesternSign | null>(null);
  const [showElements, setShowElements] = useState(true);
  const [showModalities, setShowModalities] = useState(true);

  const getElementColor = (element: string): string => {
    switch (element) {
      case 'Fire': return '#F44336';
      case 'Earth': return '#795548';
      case 'Air': return '#2196F3';
      case 'Water': return '#00BCD4';
      default: return Colors.primary;
    }
  };

  const renderSignCard = (sign: WesternSign) => (
    <TouchableOpacity
      key={sign.name}
      style={[
        styles.signCard,
        selectedSign?.name === sign.name && styles.signCardActive,
      ]}
      onPress={() => setSelectedSign(selectedSign?.name === sign.name ? null : sign)}
    >
      <View style={[styles.signSymbol, { backgroundColor: getElementColor(sign.element) + '20' }]}>
        <Text style={styles.signSymbolText}>{sign.symbol}</Text>
      </View>
      <View style={styles.signInfo}>
        <Text style={styles.signName}>{sign.name}</Text>
        <Text style={styles.signDates}>{sign.dates}</Text>
      </View>
      <View style={[styles.elementBadge, { backgroundColor: getElementColor(sign.element) }]}>
        <Text style={styles.elementBadgeText}>{sign.element}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSignDetail = () => {
    if (!selectedSign) return null;

    return (
      <View style={styles.detailCard}>
        <Text style={styles.detailTitle}>{selectedSign.symbol} {selectedSign.name}</Text>
        <Text style={styles.detailDates}>{selectedSign.dates}</Text>

        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Element</Text>
            <Text style={[styles.detailValue, { color: getElementColor(selectedSign.element) }]}>
              {selectedSign.element}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Modality</Text>
            <Text style={styles.detailValue}>{selectedSign.modality}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Ruler</Text>
            <Text style={styles.detailValue}>{selectedSign.ruler}</Text>
          </View>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Key Traits</Text>
          <View style={styles.traitsContainer}>
            {selectedSign.traits.map((trait, index) => (
              <View key={index} style={styles.traitBadge}>
                <Text style={styles.traitText}>{trait}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Strengths</Text>
          {selectedSign.strengths.map((strength, index) => (
            <View key={index} style={styles.strengthItem}>
              <Star color="#4CAF50" size={14} />
              <Text style={styles.strengthText}>{strength}</Text>
            </View>
          ))}
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Areas for Growth</Text>
          {selectedSign.weaknesses.map((weakness, index) => (
            <View key={index} style={styles.weaknessItem}>
              <Text style={styles.weaknessText}> {weakness}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1565C0', '#1976D2', '#1E88E5']}
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
            <Text style={styles.headerTitle}>Western Astrology</Text>
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
            <Sun color="#FF9800" size={20} />
            <Text style={styles.infoCardTitle}>Western Zodiac System</Text>
          </View>
          <Text style={styles.infoCardText}>
            Western astrology is based on the tropical zodiac, which divides the sky
            into 12 equal segments starting from the vernal equinox. It focuses on
            the Sun sign at birth and uses elements and modalities for interpretation.
          </Text>
        </View>

        {/* Comparison with Vedic */}
        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>Western vs Vedic Astrology</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Zodiac System</Text>
              <Text style={styles.comparisonValue}>Tropical (Western)</Text>
              <Text style={styles.comparisonValue}>Sidereal (Vedic)</Text>
            </View>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Focus</Text>
              <Text style={styles.comparisonValue}>Sun Sign</Text>
              <Text style={styles.comparisonValue}>Moon Sign</Text>
            </View>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Outer Planets</Text>
              <Text style={styles.comparisonValue}>Used</Text>
              <Text style={styles.comparisonValue}>Not used</Text>
            </View>
          </View>
        </View>

        {/* All Signs */}
        <View style={styles.signsSection}>
          <Text style={styles.sectionTitle}>Zodiac Signs</Text>
          {westernSigns.map(renderSignCard)}
        </View>

        {/* Selected Sign Detail */}
        {renderSignDetail()}

        {/* Elements */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowElements(!showElements)}
          >
            <Text style={styles.sectionTitle}>Four Elements</Text>
            {showElements ? (
              <ChevronUp color={Colors.text} size={20} />
            ) : (
              <ChevronDown color={Colors.text} size={20} />
            )}
          </TouchableOpacity>
          {showElements && (
            <View style={styles.elementsGrid}>
              {elements.map((element) => (
                <View key={element.name} style={styles.elementCard}>
                  <View style={[styles.elementHeader, { backgroundColor: element.color }]}>
                    <Text style={styles.elementName}>{element.name}</Text>
                  </View>
                  <View style={styles.elementContent}>
                    <Text style={styles.elementSigns}>{element.signs.join('  ')}</Text>
                    <Text style={styles.elementTraits}>{element.traits}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Modalities */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowModalities(!showModalities)}
          >
            <Text style={styles.sectionTitle}>Three Modalities</Text>
            {showModalities ? (
              <ChevronUp color={Colors.text} size={20} />
            ) : (
              <ChevronDown color={Colors.text} size={20} />
            )}
          </TouchableOpacity>
          {showModalities && (
            <View style={styles.modalitiesContainer}>
              {modalities.map((modality) => (
                <View key={modality.name} style={styles.modalityCard}>
                  <Text style={styles.modalityName}>{modality.name}</Text>
                  <Text style={styles.modalitySigns}>{modality.signs.join('  ')}</Text>
                  <Text style={styles.modalityDesc}>{modality.description}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
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
  comparisonCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  comparisonItem: {
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 6,
  },
  comparisonValue: {
    fontSize: 12,
    color: Colors.text,
    marginBottom: 2,
  },
  signsSection: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  signCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  signCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '05',
  },
  signSymbol: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  signSymbolText: {
    fontSize: 20,
  },
  signInfo: {
    flex: 1,
  },
  signName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  signDates: {
    fontSize: 12,
    color: Colors.textLight,
  },
  elementBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  elementBadgeText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },
  detailCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  detailDates: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  traitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  traitBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  traitText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  strengthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  strengthText: {
    fontSize: 13,
    color: Colors.text,
  },
  weaknessItem: {
    marginBottom: 6,
  },
  weaknessText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  elementsGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  elementCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  elementHeader: {
    padding: 10,
    alignItems: 'center',
  },
  elementName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  elementContent: {
    padding: 10,
  },
  elementSigns: {
    fontSize: 12,
    color: Colors.text,
    marginBottom: 4,
  },
  elementTraits: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  modalitiesContainer: {
    marginTop: 12,
    gap: 10,
  },
  modalityCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalityName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  modalitySigns: {
    fontSize: 13,
    color: Colors.primary,
    marginBottom: 6,
  },
  modalityDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
